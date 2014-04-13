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
         * For a poem, walk the DOM and pick out the canonical chunk content from
         * its HTML representation.
         * @param tw    The tree walker.
         */
        getPoemCanonicalChunkContent: function (tw) {
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
                        nodeName === dflGlobals.annotation.nodeNames.selectionEnd) {
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
                marker.setAttribute('style', 'background-color: #' + note.hiliteColor || 'ffff00');
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
                ajs(note.workControllerScope || $scope.editor);
            }
        },
        /**
         * Marks up the HTML for the selected text with the note selection nodes.
         * It also marks up the chunk information itself.
         *
         * Converts the HTML content into the canonical chunk content array representation and
         * sets it in the corresponding chunk info object.
         * The chunk representation for the content's only XML markup
         * are the selection start/end tags. All other XML markup is stripped out.
         * @param note Note object.
         */
        markupNoteSelection: function (note) {
            var startSel = document.createElement(dflGlobals.annotation.nodeNames.selectionStart),
                endSel = document.createElement(dflGlobals.annotation.nodeNames.selectionEnd),
                sid = note[dflGlobals.annotation.attributeNames.selectionId],
                range = note.range,
                canonicalizer = engine.workTypeCanonicalizers[note.chunkInfo.dataType];

            if (!canonicalizer) {
                console.trace({type: 'fatal', msg: 'Invald work chunk export type "' + note.chunkInfo.dataType + '"'});
            }

            // Mark up selection
            startSel.setAttribute(dflGlobals.annotation.attributeNames.selectionId, sid);
            endSel.setAttribute(dflGlobals.annotation.attributeNames.selectionId, sid);
            range.insertNode(startSel);
            range.collapse();
            range.insertNode(endSel);

            canonicalizer(note.chunkInfo);

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
                    var text = dflGlobals.annotation.nodeNames.prose, i;
                    if (chunkInfo.title) {
                        text += dflGlobals.utils.makeStartElement(dflGlobals.annotation.nodeNames.title) + chunkInfo.title + dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.title);
                    }
                    for (var i in items) {
                        text += dflGlobals.utils.makeStartElement(dflGlobals.annotation.nodeNames.paragraph) + items[i] + dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.paragraph);
                    }
                    return text + dflGlobals.utils.makeEndElement(dflGlobals.annotation.nodeNames.prose);
                }

                $('#editorContent')[0].innerHTML = makeText(chunkInfo.getContentArray());

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

                var content = makeText(chunkInfo.getContentArray(), EditorSettings.lineNumberingOn);

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
         * Canonicalizes the HTML content into its corresponding chunk content format.
         * This is the converse of the layout method.
         * @return {Array} Returns an array of text objects that represents the
         * chunk's content.
         */
        workTypeCanonicalizers: {

            Prose: function () {
                // TODO
                console.trace('not implemented');
            },

            /**
             * Canonicalizes the HTML version of the poem and updates the chunk info object with it.
             * @param chunkInfo
             * @constructor
             */
            Poem: function (chunkInfo) {
                var root =  $('#linedContentElement')[0] || $('#editorContent')[0],
                    nodeFilter = null,
                    tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, nodeFilter, true),
                    canonicalizedContentArray = engine.getPoemCanonicalChunkContent(tw);
                chunkInfo.setContentArray(canonicalizedContentArray);
                console.info(canonicalizedContentArray);
            }
        }
    };

    return engine;
}]);
