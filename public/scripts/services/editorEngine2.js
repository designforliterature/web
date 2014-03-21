/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2014 Ruben Kleiman
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *and associated documentation files (the "Software"), to deal in the Software without restriction,
 *including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 *subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all copies or
 *substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 *THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

'use strict';

/**
 * The editor engine is the API for manipulating the edited DOM structure.
 * This can be replaced by a different engine. The engine that will be
 * used (by default, this one) is selected by the EditorCtrl controller.
 */
horaceApp.service('EditorEngine2', ['$compile', 'EditorSettings', function ($compile, EditorSettings) {

    /**
     * Creates the document location HTML
     * @param chunkInfo The chunk info
     */
    function makeDocumentBreadcrum(chunkInfo, workTitle, chain) {
        if (!chain) {
            chain = [];
        }
        if (chunkInfo) {
            chain.splice(0, 0, chunkInfo.title);
            return makeDocumentBreadcrum(chunkInfo.parent, workTitle, chain);
        } else {
            var location = workTitle ? ('<i>' + workTitle + '</i> > ') : '',
                len = chain.length;
            for (var i in chain) {
                location += chain[i];
                if (i < len - 1) {
                    location += ' > '
                }
            }
            return location;
        }
    }

    var engine = {

        utils: {
            $compile: $compile
        },

        viewMethods: {

            // Highlights text for annotation
            selection: function (scope, anno) {
                function processSelection(selection, sid) {
                    var claz = selection.css['class'];
                    var style = selection.css.style;
                    if (!claz && !style) {
                        throw {type: 'fatal', msg: 'Annotation missing either class or style'};
                    }
                    var sels = engine.getSelectorById(anno, sid);
                    if (sels) {
                        engine.doProcessSelection(scope, anno, selection, sels[0], sels[1], claz, style);
                    }
                }

                var hiIndex;
                var sidIndex;
                var selCount = anno.views.selection.length;
                for (hiIndex = 0; hiIndex < selCount; hiIndex += 1) {
                    var selection = anno.views.selection[hiIndex];
                    var sidCount = selection.sids.length;
                    for (sidIndex = 0; sidIndex < sidCount; sidIndex += 1) {
                        var sid = selection.sids[sidIndex];
                        processSelection(selection, sid);
                    }
                }
            }
        },
        workTypeLayouts: {

            /* A prose section */
            Prose: function (chunkInfo, workTitle) {
                function makeText(items) {
                    var text = '<D_R>', i;
                    if (chunkInfo.title) {
                        text += '<D_T>' + chunkInfo.title + '</D_T>';
                    }
                    for (var i in items) {
                        text += '<D_F>' + items[i] + '</D_F>';
                    }
                    return text + '</D_R>';
                }

                var contentElement = $('#editorContent')[0];
                contentElement.innerHTML = makeText(chunkInfo.content);

                var documentBreadcrumb = $('#documentBreadcrumb')[0];
                documentBreadcrumb.innerHTML = makeDocumentBreadcrum(chunkInfo, workTitle);
            },

            /* A poem */
            Poem: function (chunkInfo, workTitle) {

                function makeText(lines, doNumber) {

                    var text = '<D_P>', numbering = '', everyNLines = (EditorSettings.everyNLines || 1), lineCount = 0, openVerse = true;

                    // Returns a line number HTML or an empty line
                    function makeNumber(lineNumber) {
                        if (lineNumber) {
                            lineNumber = (lineNumber % everyNLines !== 0) ? '&nbsp;' : lineNumber;
                        } else {
                            lineNumber = '&nbsp;';
                        }
                        return '<D_L>' + lineNumber + '</D_L>';
                    }

                    text += '<D_V>';
                    for (var lineNo in lines) {
                        var item = lines[lineNo];
                        if (lineNo === 0 || item.length === 0) {
                            text += openVerse ? '</D_V>' : '<D_V>';
                            openVerse = !openVerse;
                            if (doNumber) {
                                numbering += makeNumber()
                            }
                            item = '&nbsp;';
                        } else if (doNumber) {
                            numbering += makeNumber(lineCount += 1);
                        }
                        text += '<D_L>' + item + '</D_L>';
                    }
                    if (openVerse) {
                        text += '</D_V>';
                    }
                    text += '</D_P>';
                    return {text: text, numbering: numbering};
                }

                var contentElement = $('#editorContent')[0];
                var content = makeText(chunkInfo.content, EditorSettings.lineNumberingOn);

                var documentBreadcrumb = $('#documentBreadcrumb')[0];
                documentBreadcrumb.innerHTML = makeDocumentBreadcrum(chunkInfo, workTitle);

                if (EditorSettings.lineNumberingOn) {
                    var html = '<table><tr><td style="vertical-align: top"><table><tr><td><D_T>' + chunkInfo.title + '</D_T></td></tr><tr><td style="vertical-align: top;">' + content.text + '</td><td style="vertical-align: top;">' + content.numbering + '</td></tr></table></td></tr></table>';
                    contentElement.innerHTML = html;
                } else {
                    contentElement.innerHtml = content.text;
                }
            }
        },

        /**
         *
         * @param anno  An annotation object
         * @param sid The annotation selector id
         * @returns Returns an array whose elements are, in order, the start and corresponding end selector.
         *          Returns null if the selector pair was not found.
         */
        getSelectorById: function (anno, sid) { // TODO could cache
            var evaluator = new XPathEvaluator();
            var selector = [];
            var index;
            var count = EditorSettings.xpaths.findSelectors.length;
            for (index = 0; index < count; index += 1) {
                var i = EditorSettings.xpaths.findSelectors[index];
                i = i + "[@sid='" + sid + "']";
                var iter = evaluator.evaluate(i, document.documentElement, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
                var s = iter.iterateNext();
                while (s) {
                    selector.push(s);
                    s = iter.iterateNext();
                }
            }
            if (selector.length === 2) {
                return selector;
            }
            return null;
        },

        /*
         Navigates the DOM starting at the specified d_se element
         until it finds the corresponding d_se element. All text
         in between the two elements is is surrounded by span elements,
         as necessary, with the specified class and/or style.

         * @param scope The scope from some controller
         @param anno The annotation
         @param selection The selection
         @param startSel The d_ss element starting the selection
         @param endSel The d_se element ending the selection
         @param claz An optional CSS class to apply to the span element surrounding the
         text enclosed by the selection. May be null.
         @param style An optional style to apply to the span element. May be null.
         */
        doProcessSelection: function (scope, anno, selection, startSel, endSel, claz, style) {
            var context = anno.context;
            var root = document.getElementsByTagName(context.parent);
            if (!root) {
                throw {type: 'fatal', msg: 'Invalid context "' + context.parent + '"'};
            }
            root = root[0];
            var sid = startSel.attributes.sid.nodeValue;
//            console.log('startSel=' + startSel + ' root=' + root + 'sid=' + sid);
            var nodeFilter = null; // TODO one that ignores anything besides text, D_SS, D_SE nodes
            var tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, engine.SelectorNodeFilter, false);
            engine.processSelectionSid(scope, tw, anno, selection, startSel, endSel, sid, claz, style);
        },

        /*
         Walks the tree of the annotation's context and processes a single sid in a selection.

         @param scope The scope from some controller
         @param anno The annotation
         @param selection The selection
         @param startSel The d_ss element starting the selection's sid fragment
         @param endSel The d_se element ending the selection's sid fragment
         @param sid The sid of the [start and end] selection elements.
         @param claz Optional CSS class to employ
         @param style Optional CSS style to employ
         */
        processSelectionSid: function (scope, tw, anno, selection, startSel, endSel, sid, claz, style) {
            var write = false;
            var curr = tw.nextNode();
            while (curr) {
                if (curr.nodeName === EditorSettings.nodeNames.selectionStart && curr.attributes.sid.nodeValue === sid) {
                    write = true; // we entered the selection range
                } else if (curr.nodeName === EditorSettings.nodeNames.selectionEnd && curr.attributes.sid.nodeValue === sid) {
                    return; // leaving the selection range
                }
                if (write && curr.nodeType === Node.TEXT_NODE) {
                    engine.writeSelectionDom(scope, curr, selection, claz, style);
                }
                curr = tw.nextNode();
            }

            if (selection.note) { // Is there a note attached to this sid
                // TODO incomplete
            }
        },

        /**
         * Applies the CSS hilite style to the node (typically a text node)
         *
         * @param scope The scope from some controller
         * @param node  The text node (TODO handle img etc...).
         * @param selection The selection
         * @param claz Optional class to apply
         * @param style Optional local style to apply
         */
        writeSelectionDom: function (scope, node, selection, claz, style) {
            var hilite = document.createElement(EditorSettings.nodeNames.selectionSpan);
            if (claz) {
                hilite.setAttribute('class', claz);
            }
            if (style) {
                hilite.setAttribute('style', style);
            }
            var textParent = node.parentElement;
            var tooltip;
            if (selection.note) { // Add a tooltip for the note
                tooltip = document.createElement(EditorSettings.nodeNames.tooltip);
                tooltip.setAttribute('tooltip-html-unsafe', selection.note.text);
                tooltip.setAttribute('tooltip-trigger', 'click');
            }
            textParent.replaceChild(hilite, node);
            if (tooltip) {
                hilite.appendChild(tooltip);
                tooltip.appendChild(node);
            } else {
                hilite.appendChild(node);
            }

            // Recompile content for DOM changes to take effect
            var ajs = engine.utils.$compile(textParent);
            ajs(scope);
        },

        /**
         * Class SelectorNodeFilter is a NodeFilter that filters out
         * a node if it is not a text node, or a D_SS or D_SE element.
         */
        SelectorNodeFilter: function (node) {
            if (node.nodeType === Node.TEXT_NODE || node.nodeName === EditorSettings.nodeNames.selectionStart || node.nodeName === EditorSettings.nodeNames.selectionEnd) {
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
        },

        /** TODO move to utilities
         * Creates an XML node element tag.
         * @param nodeName Name of the node
         * @param terminating    If true, then this is a terminating tag.
         * @returns {string} The tag element
         */
        makeNodeTag: function (nodeName, terminating) {
            if (terminating) {
                return '</' + nodeName + '>';
            }
            return '<' + nodeName + '>';
        },

        /** TODO move to utilities TODO maybe use document.createElement if more efficient
         * Wraps the body text with the specified node name.
         * @param nodeName  The name of the node
         * @param body  The text to wrap
         * @returns {string} The wrapped body
         */
        wrapNodeTag: function (nodeName, body) {
            return '<' + nodeName + '>' + body + '</' + nodeName + '>';
        }
    };
    return engine;
}]);
