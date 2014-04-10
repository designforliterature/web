/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

'use strict';

/**
 * The editor engine is the API for manipulating the edited DOM structure.
 * This can be replaced by a different engine. The engine that will be
 * used (by default, this one) is selected by the EditorCtrl controller.
 *
 * The editor engine must assume the following conventions:
 *
 * The element id = 'editorContent' corresponds to the content element when line numbering is not used.
 * The element id = 'linedContentElement' corresponds to the actual content element when line numbering is used.
 *    One should first check for the linedContentElement: if it's absent, use the editorContent element.
 * The optional element id = 'documentBreadcrumb' is the location where a document breadcrumb should be rendered.
 */
horaceApp.service('EditorEngine', ['$compile', 'EditorSettings', function ($compile, EditorSettings) {

    /**
     * Creates the document location HTML
     * @param chunkInfo The chunk info
     */
    function makeDocumentBreadcrumb(chunkInfo, workTitle, chain) {
        if (!chain) {
            chain = [];
        }
        if (chunkInfo) {
            chain.splice(0, 0, chunkInfo.title);
            return makeDocumentBreadcrumb(chunkInfo.parent, workTitle, chain);
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

    /**
     * This is a plugin engine.
     */
    var engine = {

        /**
         * Used in a tree traversal
         * @param node  The current node
         * @returns {*} Returns the type of filter to use based on the node
         */
        tw_getNodeFilter: function (node) {
            if (node.nodeType === Node.TEXT_NODE || node.nodeName === dflGlobals.annotation.nodeNames.selectionStart || node.nodeName === dflGlobals.annotation.nodeNames.selectionEnd) {
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
        },

        /**
         * Walks the tree and collects the affected text nodes within the specified selection sid in an array in
         * their order of occurrence. The specified applyFun is applied to
         * the array of text nodes. Collecting the array instead of applying the function
         * to each text node allows applyFun to know which text node is last
         * and to perform arbitrary operations that might require knowledge
         * of other text nodes' content.
         * Since an annotation can span across multiple elements (including partial ones)
         * we must visit each text node in the span.
         * @param tw    The tree walker
         * @param applyFun A function to apply to each text node: it must accept
         * two arguments: the text node and the params object.
         * @param params An object containing information relevant to the applyFun.
         * Walktree expects it to have the selection id property with the sid whose
         * text nodes are to be scanned.
         * @return {number} The number of text nodes to which applyFun was applied
         */
        walkSelectionTextNodes: function (tw, applyFun, params) {
            var write = false,
                sid = params[dflGlobals.annotation.attributeNames.selectionId],
                currNode = tw.nextNode(),
                textNodes = []; // text nodes in selection in order first to last
            while (currNode) {
                if (currNode.nodeName === dflGlobals.annotation.nodeNames.selectionStart && currNode.attributes[dflGlobals.annotation.attributeNames.selectionId].nodeValue === sid) {
                    write = true; // we entered the selection range: now look for text nodes
                    // fall through to pick up next node
                } else if (currNode.nodeName === dflGlobals.annotation.nodeNames.selectionEnd && currNode.attributes[dflGlobals.annotation.attributeNames.selectionId].nodeValue === sid) {
                    applyFun(textNodes, params);
                    return textNodes.length; // leaving the selection range: we're done with its text nodes
                }
                if (write && currNode.nodeType === Node.TEXT_NODE) {
                    textNodes.push(currNode);
                }
                currNode = tw.nextNode();
            }
            applyFun(textNodes, params);
            return textNodes.length; // JIC
        },

        /**
         * Walk the DOM and pick out the canonical chunk content from
         * its HTML representation.
         * @param tw    The tree walker.
         */
        getCanonicalChunkContent: function (tw) {
            var currNode = tw.nextNode(),
                textSegment = '',
                insideEmptyLine = false,
                chunkContent = [];

            function useNode(node) {
                var nodeName = currNode.nodeName;
                return (nodeName === dflGlobals.annotation.nodeNames.selectionStart ||
                    nodeName === dflGlobals.annotation.nodeNames.selectionEnd ||
                    nodeName === dflGlobals.annotation.nodeNames.line ||
                    nodeName === dflGlobals.annotation.nodeNames.emptyLine ||
                    currNode.nodeType === Node.TEXT_NODE)
            }

            while (currNode) {
                if (useNode(currNode)) {
                    var nodeName = currNode.nodeName,
                        nodeType = currNode.nodeType;
                    if (nodeType === Node.TEXT_NODE) {
                        if (insideEmptyLine) {
                            chunkContent.push('');
                            insideEmptyLine = false;
                        } else {
                            textSegment += currNode.nodeValue;
                        }
                    } else if (nodeName === dflGlobals.annotation.nodeNames.selectionStart ||
                        nodeName === dflGlobals.annotation.nodeNames.selectionEnd) {  // TODO might be ok to be in form <d_ss sid="1"/> instead of <d_ss sid="1"></d_ss>
                        textSegment += dflGlobals.utils.makeStartElement(currNode.nodeName, currNode.attributes);
                        textSegment += dflGlobals.utils.makeEndElement(currNode.nodeName);
                    } else if (nodeName === dflGlobals.annotation.nodeNames.line) {
                        if (textSegment.length !== 0) {
                            chunkContent.push(textSegment);
                            textSegment = '';
                        }
                    } else if (nodeName === dflGlobals.annotation.nodeNames.emptyLine) {
                        insideEmptyLine = true; // empty line precisely contains a space
                    }
                }
                currNode = tw.nextNode();
            }
            if (textSegment.length !== 0) {
                chunkContent.push(textSegment);
            }

            return chunkContent;
        },

        highlightMethod: function (textNodes, note) {
            for (var i in textNodes) {
                var textNode = textNodes[i];
                var marker = document.createElement(EditorSettings.nodeNames.selectionSpan);
                marker.setAttribute('style', 'background-color: #ffff00');
                var textParent = textNode.parentElement;
                if (note.tooltipPlacement) {
                    marker.setAttribute('tooltip-html-unsafe', dflGlobals.utils.sanitizeObject(note.text));
                    marker.setAttribute('tooltip-placement', note.tooltipPlacement);
                    if (note.tooltipMethod) { // default is hover
                        marker.setAttribute('tooltip-trigger', note.tooltipMethod);
                    }
                }
                textParent.replaceChild(marker, textNode);
                marker.appendChild(textNode);

                // Recompile content for DOM changes to take effect
                var ajs = $compile(textParent);
                ajs(note.workControllerScope);
            }
        },
        /**
         * Marks up the HTML for the selected text with the note selection nodes.
         * It also marks up the chunk information itself.
         * @param note Note parameters.
         * @param exporter Content exporter to use
         */
        markupNoteSelection: function (note, exporter) {
            var startSel = document.createElement(dflGlobals.annotation.nodeNames.selectionStart),
                endSel = document.createElement(dflGlobals.annotation.nodeNames.selectionEnd),
                sid = note[dflGlobals.annotation.attributeNames.selectionId],
                range = note.range;

            // Mark up selection
            startSel.setAttribute(dflGlobals.annotation.attributeNames.selectionId, sid);
            endSel.setAttribute(dflGlobals.annotation.attributeNames.selectionId, sid);
            range.insertNode(startSel);
            range.collapse();
            range.insertNode(endSel);

            // Export selection HTML into canonical chunk format
            exporter(note.chunkInfo);

            console.info('INSERTED: sid ' + sid);
        },

        /**
         * Enables a note presentation by highliting and adding optional popups. Assumes normalized HTML.
         * @param note Note parameters.
         */
        enableNote: function (note) {
            var tw = document.createTreeWalker($('#editorContent')[0], NodeFilter.SHOW_ALL, engine.tw_getNodeFilter, false),
                affectedTextNodeCount = engine.walkSelectionTextNodes(tw, engine.highlightMethod, note);
            console.info('Affected text nodes: ' + affectedTextNodeCount);
        },

        /**
         * Functions keyed by work type that lay out the chunk's text in HTML.
         * @param chunkInfo The chunk info object for the text being layed out
         * @param workTitle The title of the work
         */
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

                $('#editorContent')[0].innerHTML = makeText(chunkInfo.content);

                var documentBreadcrumb = $('#documentBreadcrumb')[0];
                if (documentBreadcrumb) {
                    documentBreadcrumb.innerHTML = makeDocumentBreadcrumb(chunkInfo, workTitle);
                }
            },

            /* A poem */
            Poem: function (chunkInfo, workTitle) {

                function makeText(lines, doNumber) { // TODO take out of inlined position

                    var text = dflGlobals.utils.makeStartElement(dflGlobals.annotation.nodeNames.poem),
                        numbering = '', everyNLines = (EditorSettings.everyNLines || 1),
                        lineCount = 0,
                        emptyLine = dflGlobals.annotation.special.emptyLine,
                        lineStartTag = dflGlobals.utils.makeStartElement(dflGlobals.annotation.nodeNames.line),
                        lineEndTag = dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.line);

                    // Returns a line number HTML or an empty line
                    function makeNumber(lineNumber) {
                        if (lineNumber) {
                            lineNumber = (lineNumber % everyNLines !== 0) ? '&nbsp;' : lineNumber;
                        } else {
                            lineNumber = '&nbsp;';
                        }
                        return lineStartTag + lineNumber + lineEndTag;
                    }

//                    text += verseStartTag;
                    for (var lineNo in lines) {
                        var item = lines[lineNo];
                        if (lineNo === 0 || item.length === 0) {
                            if (doNumber) { // don't count empty lines
                                numbering += makeNumber()
                            }
                            item = '&nbsp;';
                            text += emptyLine;
                        } else if (doNumber) {
                            lineCount += 1;
                            numbering += makeNumber(lineCount);
                            text += lineStartTag + item + lineEndTag;
                        }
                    }
                    text += dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.poem);

                    return {text: text, numbering: numbering};
                }

                var content = makeText(chunkInfo.content, EditorSettings.lineNumberingOn);

                var documentBreadcrumb = $('#documentBreadcrumb')[0];
                documentBreadcrumb.innerHTML = makeDocumentBreadcrumb(chunkInfo, workTitle);

                if (EditorSettings.lineNumberingOn) {
                    var html = '<table><tr><td style="vertical-align: top"><table><tr><td>' +
                        dflGlobals.utils.makeStartElement(dflGlobals.annotation.nodeNames.title)
                        + chunkInfo.title +
                        dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.title)
                        + '</td></tr><tr><td id="linedContentElement" style="vertical-align: top;">' + content.text + '</td><td style="vertical-align: top;">' + content.numbering + '</td></tr></table></td></tr></table>';
                    $('#editorContent')[0].innerHTML = html;
                } else {
                    $('#editorContent')[0].innerHtml = content.text;
                }
            }
        },

        /**
         * Exports the HTML content into its corresponding chunk content format.
         * This is the converse of the layout method.
         * @return {Array} Returns an array of text objects that represents the
         * chunk's content.
         */
        workTypeExporters: {

            Prose: function () {
                // TODO
                alert('not implemented');
                console.trace('not implemented');
            },

            /**
             * Exports the HTML version of them poem into the canonical chunk format.
             * @param chunkInfo
             * @constructor
             */
            Poem: function (chunkInfo) {
                var root =  $('#linedContentElement')[0] || $('#editorContent')[0],
                    html = root.innerHTML,
                    nodeFilter = null,
                    tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, nodeFilter, true),
                    canonicalizedChunkContent = engine.getCanonicalChunkContent(tw);

//                console.info(root.innerHTML);
                // TODO set chunkInfo.content with the array
                // TODO set the cached chunk's content with the array
                console.info(canonicalizedChunkContent);
            }
        }

//               utils: {
//            $compile: $compile
//        },
//
//        viewMethods: {
//
//            // Highlights text for annotation
//            selection: function (scope, anno) {
//                function processSelection(selection, sid) {
//                    var claz = selection.css['class'];
//                    var style = selection.css.style;
//                    if (!claz && !style) {
//                        throw {type: 'fatal', msg: 'Annotation missing either class or style'};
//                    }
//                    var sels = engine.getSelectorById(anno, sid);
//                    if (sels) {
//                        engine.doProcessSelection(scope, anno, selection, sels[0], sels[1], claz, style);
//                    }
//                }
//
//                var hiIndex;
//                var sidIndex;
//                var selCount = anno.views.selection.length;
//                for (hiIndex = 0; hiIndex < selCount; hiIndex += 1) {
//                    var selection = anno.views.selection[hiIndex];
//                    var sidCount = selection.sids.length;
//                    for (sidIndex = 0; sidIndex < sidCount; sidIndex += 1) {
//                        var sid = selection.sids[sidIndex];
//                        processSelection(selection, sid);
//                    }
//                }
//            }
//        },
//
//        /**
//         *
//         * @param anno  An annotation object
//         * @param sid The annotation selector id
//         * @returns Returns an array whose elements are, in order, the start and corresponding end selector.
//         *          Returns null if the selector pair was not found.
//         */
//        getSelectorById: function (anno, sid) { // TODO could cache
//            var evaluator = new XPathEvaluator();
//            var selector = [];
//            var index;
//            var count = EditorSettings.xpaths.findSelectors.length;
//            for (index = 0; index < count; index += 1) {
//                var i = EditorSettings.xpaths.findSelectors[index];
//                i = i + "[@" + dflGlobals.annotation.attributeNames.selectionId + "='" + sid + "']";
//                var iter = evaluator.evaluate(i, document.documentElement, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
//                var s = iter.iterateNext();
//                while (s) {
//                    selector.push(s);
//                    s = iter.iterateNext();
//                }
//            }
//            if (selector.length === 2) {
//                return selector;
//            }
//            return null;
//        },
//
//        /*
//         Navigates the DOM starting at the specified selection-end element
//         until it finds the corresponding selection-end element. All text
//         in between the two elements is is surrounded by span elements,
//         as necessary, with the specified class and/or style.
//
//         * @param scope The scope from some controller
//         @param anno The annotation
//         @param selection The selection
//         @param startSel The selection-start element starting the selection
//         @param endSel The selection-end element ending the selection
//         @param claz An optional CSS class to apply to the span element surrounding the
//         text enclosed by the selection. May be null.
//         @param style An optional style to apply to the span element. May be null.
//         */
//        doProcessSelection: function (scope, anno, selection, startSel, endSel, claz, style) {
//            var context = anno.context;
//            var root = document.getElementsByTagName(context.parent);
//            if (!root) {
//                throw {type: 'fatal', msg: 'Invalid context "' + context.parent + '"'};
//            }
//            var sid = startSel.attributes[dflGlobals.annotation.attributeNames.selectionId].nodeValue;
//            var nodeFilter = null; // TODO one that ignores anything besides text, selection-start, selection-end nodes
//            var tw = document.createTreeWalker(root[0], NodeFilter.SHOW_ALL, engine.SelectorNodeFilter, false);
//            engine.processSelectionSid(scope, tw, anno, selection, startSel, endSel, sid, claz, style);
//        },
//
//        /*
//         Walks the tree of the annotation's context and processes a single sid in a selection.
//
//         @param scope The scope from some controller
//         @param tw The tree walker
//         @param anno The annotation
//         @param selection The selection
//         @param startSel The selection-start element starting the selection's sid fragment
//         @param endSel The selection-end element ending the selection's sid fragment
//         @param sid The sid of the [start and end] selection elements.
//         @param claz Optional CSS class to employ
//         @param style Optional CSS style to employ
//         */
//        processSelectionSid: function (scope, tw, anno, selection, startSel, endSel, sid, claz, style) {
//            var write = false;
//            var curr = tw.nextNode();
//            while (curr) {
//                if (curr.nodeName === EditorSettings.nodeNames.selectionStart && curr.attributes[dflGlobals.annotation.attributeNames.selectionId].nodeValue === sid) {
//                    write = true; // we entered the selection range
//                } else if (curr.nodeName === EditorSettings.nodeNames.selectionEnd && curr.attributes[dflGlobals.annotation.attributeNames.selectionId].nodeValue === sid) {
//                    return; // leaving the selection range
//                }
//                if (write && curr.nodeType === Node.TEXT_NODE) {
//                    engine.writeSelectionDom(scope, curr, selection, claz, style);
//                }
//                curr = tw.nextNode();
//            }
//
//            if (selection.note) { // Is there a note attached to this sid
//                // TODO incomplete
//            }
//        },
//
//        /**
//         * Applies the CSS hilite style to the node (typically a text node)
//         *
//         * @param scope The scope from some controller
//         * @param node  The text node (TODO handle img etc...).
//         * @param selection The selection
//         * @param claz Optional class to apply
//         * @param style Optional local style to apply
//         */
//        writeSelectionDom: function (scope, node, selection, claz, style) {
//            var hilite = document.createElement(EditorSettings.nodeNames.selectionSpan);
//            if (claz) {
//                hilite.setAttribute('class', claz);
//            }
//            if (style) {
//                hilite.setAttribute('style', style);
//            }
//            var textParent = node.parentElement;
//            var tooltip;
//            if (selection.note) { // Add a tooltip for the note
//                tooltip = document.createElement(EditorSettings.nodeNames.tooltip);
//                tooltip.setAttribute('tooltip-html-unsafe', selection.note.text);
//                tooltip.setAttribute('tooltip-trigger', 'click');
//            }
//            textParent.replaceChild(hilite, node);
//            if (tooltip) {
//                hilite.appendChild(tooltip);
//                tooltip.appendChild(node);
//            } else {
//                hilite.appendChild(node);
//            }
//
//            // Recompile content for DOM changes to take effect
//            var ajs = engine.utils.$compile(textParent);
//            ajs(scope);
//        },
//
//        /**
//         * Class SelectorNodeFilter is a NodeFilter that filters out
//         * a node if it is not a text node, or a selection-start or selection-end element.
//         */
//        SelectorNodeFilter: function (node) {
//            if (node.nodeType === Node.TEXT_NODE || node.nodeName === EditorSettings.nodeNames.selectionStart || node.nodeName === EditorSettings.nodeNames.selectionEnd) {
//                return NodeFilter.FILTER_ACCEPT;
//            }
//            return NodeFilter.FILTER_SKIP;
//        },
//
//        /** TODO move to utilities
//         * Creates an XML node element tag.
//         * @param nodeName Name of the node
//         * @param terminating    If true, then this is a terminating tag.
//         * @returns {string} The tag element
//         */
//        makeNodeTag: function (nodeName, terminating) {
//            if (terminating) {
//                return '</' + nodeName + '>';
//            }
//            return '<' + nodeName + '>';
//        },
//
//        /** TODO move to utilities TODO maybe use document.createElement if more efficient
//         * Wraps the body text with the specified node name.
//         * @param nodeName  The name of the node
//         * @param body  The text to wrap
//         * @returns {string} The wrapped body
//         */
//        wrapNodeTag: function (nodeName, body) {
//            return '<' + nodeName + '>' + body + '</' + nodeName + '>';
//        }
    };
    return engine;
}]);
