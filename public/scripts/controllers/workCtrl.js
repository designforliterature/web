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


// TODO The following functions (before the controller is defined) should be moved into the editorEngine2 service

/**
 * Marks up the HTML for the selected text with the note selection nodes.
 * @param selection   The text selection object (platform dependent!)
 */
function markupNoteSelection(params) {
//        var container = document.createElement("div");
    var startSel = document.createElement('D_SS'),
        endSel = document.createElement('D_SE'),
        sid = params.sid,
        range = params.range;
//            container.appendChild(range.cloneContents());
    startSel.setAttribute('sid', sid);
    endSel.setAttribute('sid', sid);
    range.insertNode(startSel);
    range.collapse();
    range.insertNode(endSel);
    console.info('INSERTED: sid ' + sid);
}

/**
 * Used in a tree traversal
 * @param node  The current node
 * @returns {*} Returns the type of filter to use based on the node
 */
function tw_getNodeFilter(node) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'D_SS' || node.nodeName === 'D_SE') {
        return NodeFilter.FILTER_ACCEPT;
    }
    return NodeFilter.FILTER_SKIP;
}

/**
 * Walks the tree and collects the affected text nodes in an array in
 * their order of occurrence. The specified applyFun is applied to
 * the array. Collecting the array instead of applying the function
 * to each text node allows applyFun to know which text node is last
 * and to perform arbitrary operations that might require knowledge
 * of other text nodes' content.
 * Since an annotation can span across multiple elements (including partial ones)
 * we must visit each text node in the span.
 * @param tw    The tree walker
 * @param applyFun A function to apply to each text node: it must accept
 * two arguments: the text node and the info object.
 * @param info An object containing information relevant to the applyFun.
 * Walktree expects it to have a property named 'sid' with the sid whose
 * text nodes are to be scanned.
 * @return {number} The number of text nodes to which applyFun was applied
 */
function walkTree(tw, applyFun, info) {
    var write = false,
        sid = info.sid,
        curr = tw.nextNode(),
        textNodes = []; // text nodes in selection in order first to last
    while (curr) {
        if (curr.nodeName === 'D_SS' && curr.attributes.sid.nodeValue === sid) {
            write = true; // we entered the selection range: now look for text nodes
            // fall through to pick up next node
        } else if (curr.nodeName === 'D_SE' && curr.attributes.sid.nodeValue === sid) {
            applyFun(textNodes, info);
            return textNodes.length; // leaving the selection range: we're done with its text nodes
        }
        if (write && curr.nodeType === Node.TEXT_NODE) {
            textNodes.push(curr);
        }
        curr = tw.nextNode();
    }
    applyFun(textNodes, info);
    return textNodes.length; // JIC
}

/**
 * Highlights the text node and adds a note popup to it.
 * Function suitable applyFun arg to walkTree.
 * @param textNodes The text nodes
 * @param info Information for hilighting (TODO: could have preferred styleSpecs, etc.)
 */
function highlightMethod(textNodes, info) {
    for (var i in textNodes) {
        var marker = document.createElement('D_S'), // TODO get it from dflGlobals
            textNode = textNodes[i],
            textParent = textNode.parentElement;
        marker.setAttribute('class', 'D_HY'); // TODO get it from dflGlobals
        textParent.replaceChild(marker, textNode);
        marker.appendChild(textNode);
    }
}

/* Shows an annotation (by highliting and note popups): assumes normalized HTML */
function showNote(sid) {
    var info = {
            sid: sid || getSid(),
            popup: false    // show note popup, too?
        },
        tw = document.createTreeWalker($('#editorContent')[0], NodeFilter.SHOW_ALL, tw_getNodeFilter, false),
        affectedTextNodeCount = walkTree(tw, highlightMethod, info);
    console.info('Affected text nodes: ' + affectedTextNodeCount + ' info: ' + JSON.stringify(info));
}


horaceApp.controller('WorkCtrl', function ($scope, EditorEngine2, WorkDirectoryService, EditorSettings, UserPrefs, $stateParams, $modal) {

    function makeJtreeData(toc, jtreeData) { // TODO deal with a huge outline // TODO make recursive for all levels
        for (var i in toc) {
            var chunk = toc[i],
                toplevelItem = {id: chunk.id, icon: false, text: chunk.title};
            jtreeData.push(toplevelItem);
            if (chunk.sections && chunk.sections.length !== 0) {
                toplevelItem.children = [];
                makeJtreeData(chunk.sections, toplevelItem.children);
            }
        }
    }

    /**
     * On mouseup in the content area with the alt key depressed,
     * the user intends to create a note.
     * @param e The event
     */
    $('#editorContent')[0].onmouseup = function (e) {
        if (e.altKey) { // Option key creates a note
            createNote(e);
        }
    };

    /**
     * Selects the specified node and deselects all others.
     * @param nodeId    The id of the node to select (corresponds to the chunk info id)
     */
    function selectTocNode(nodeId) {
        if (nodeId) {
            $.jstree.reference('#toc').deselect_all(true);
            $.jstree.reference('#toc').select_node(nodeId);
        }
    }

    /**
     * Annotates a selection. Simple for now
     * @param e The event object
     */
    function createNote(e) {
        $('#editorContent')[0].normalize(); // get rid of empty and merge sibling text nodes
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection(),
                sid = "19"; // TODO variable!
            if (sel.rangeCount) {
                if (sel.isCollapsed) {
                    console.info('nothing selected');
                } else {
//                    markupNoteSelection(sel); // if it were done immediately
                    $scope.editor.openCreateNoteDialog(sid, sel);
                }
            }
        } else {
            alert('This browser is not supported')
        }
    }

    /* Execute after document loads */
    $scope.$on('$viewContentLoaded', function () { // TODO this only works for poems now
        $.ajax({ // TODO convert to $http call for consistency
            type: "GET",
            url: 'catalog/work/chunk?id=' + $scope.editor.id,
            success: function (response) {
                if (response.type === 'ack') {
                    if (response.content) {
                        try {
                            $scope.editor.activateSettings(EditorSettings);
                            $scope.editor.workDirectory = WorkDirectoryService.makeDirectory(response.content);
                            $scope.editor.pager.totalSections = $scope.editor.workDirectory.getSectionCount();
                            $scope.editor.workTitle = response.content.workTitle;
                            var jtreeData = [],
                                jtreeToc = {
//                                    plugins: ['search'],
                                    core: {multiple: false, data: jtreeData}
                                };
                            makeJtreeData(response.content.toc, jtreeData);

                            $('#toc').jstree(jtreeToc);
                            $('#toc').on('changed.jstree', function (event, data) {
                                var chunkInfo = $scope.editor.workDirectory.getChunkInfo(data.node.id, function (err, chunkInfo) {
                                    $scope.editor.setContent(chunkInfo);
                                });
                            });
                            $('#toc').on('hover_node.jstree', function (event, data) {
//                                console.info('Hover: ' + JSON.stringify(data.node.text) + ' id: ' + data.node.id);
                            });
                            // Set initial content TODO pick up "last location" from user history
                            $scope.editor.workDirectory.getChunkInfo(response.content.id, function (err, chunkInfo) {
                                $.jstree.reference('#toc').select_node(response.content.id);
                                $scope.editor.setContent(chunkInfo);
                            });
                        } catch (error) {
                            console.trace(error.message, error.stack); // TODO handle this
                        }
                    } else {
                        alert('no content'); // TODO handle this
                        console.trace(response)
                    }
                } else { // TODO handle development error
                    console.trace(response);
                }
            },
            error: function (err) {
                console.trace(err); // TODO handle real error
            }
        });
    });

    /**
     * Drawer: constructor for a drawer UI object.
     * @param drawerId The id of the element that has the contents of the drawer
     * @constructor
     */
    function Drawer(drawerId) {
        this.snap = new Snap({
            element: $('#' + drawerId)[0],
            disable: 'right',
            tapToClose: false, // don't let snap take over mouse events
            touchToDrag: false,
            maxPosition: 220 // Adjust this to close the gap between edge of drawer and content area
        });
        /*  Toggles drawer (open/close) */
        this.toggle =
            function () {
                if (this.snap.state().state == "left") {
                    this.snap.close();
                } else {
                    this.snap.open('left');
                }
            };
    }

    /* Drawer for the table of contents and other goodies */
    var drawer = new Drawer('tocDrawer');

    $scope.editor = {

        /* drawer: contains table of contents and perhaps other aids */
        drawer: drawer,

        editorMenu: {
            openToc: {
                title: 'Table of Contents',
                method: function () {
                    $scope.editor.drawer.toggle();
                }
            },
            showNotes: {
                title: 'Show Notes',
                method: function () {
                    showNote("19"); // TODO get actual sid
                }
            },
            statistics: {
                title: 'Statistics',
                method: function () {
                    alert('Statistics');
                }
            }
        },

        /* id: The id of the chunk to go to when this page is reached */
        id: $stateParams.id,

        /* The currently layed out chunk */
        currentChunkInfo: undefined,

        /* The title of the currently selected work */
        workTitle: undefined,

        /* Start pagination controls */
        pager: {
            currentSection: undefined,
            totalSections: undefined,
            setSection: function () {
                var newPageNo = parseInt($('#currentSection')[0].value, 10);
                if (newPageNo && newPageNo > 0 && newPageNo <= this.totalSections && newPageNo !== this.currentSection) {
                    var currChunk = $scope.editor.currentChunkInfo,
                        direction = (currChunk.index < newPageNo) ? 'nextSib' : 'prevSib';
                    while (currChunk.index !== newPageNo) {
                        currChunk = currChunk[direction];
                    }
                    selectTocNode(currChunk.id);
                }
            },
            /**
             * Goes to the previous section at the same level
             */
            goPreviousSection: function () {
                if ($scope.editor.currentChunkInfo.prevSib) {
                    selectTocNode($scope.editor.currentChunkInfo.prevSib.id);
                }
            },
            goPreviousChunk1: function (chunkInfo) {
                if (chunkInfo.children) {
                    this.goPreviousChunk1(chunkInfo.children[chunkInfo.children.length - 1]);
                } else {
                    selectTocNode(chunkInfo.id);
                }
            },
            /**
             * Goes to the chunk before the current one. This might
             * mean going to a lower (child chunk) or higher (parent chunk) level.
             */
            goPreviousChunk: function (chunkInfo) {
                if (!chunkInfo) {
                    chunkInfo = $scope.editor.currentChunkInfo;
                }
                if (chunkInfo.prevSib) {
                    if (chunkInfo.prevSib.children) {
                        this.goPreviousChunk1(chunkInfo.prevSib.children[chunkInfo.prevSib.children.length - 1]);
                    } else {
                        selectTocNode(chunkInfo.prevSib.id);
                    }
                } else if (chunkInfo.parent) {
                    selectTocNode(chunkInfo.parent.id);
                }
            },
            /**
             * Goes to the next section at the same level
             */
            goNextSection: function () {
                if ($scope.editor.currentChunkInfo.nextSib) {
                    selectTocNode($scope.editor.currentChunkInfo.nextSib.id);
                }
            },
            goNextChunk1: function (fromChunkInfo) {
                if (fromChunkInfo.parent) {
                    if (fromChunkInfo.parent.nextSib) {
                        selectTocNode(fromChunkInfo.parent.nextSib.id);
                    } else {
                        this.goNextChunk1(fromChunkInfo.parent);
                    }
                }
            },
            /**
             * Goes to the chunk after the current one. This might
             * mean going to a lower (child chunk) or higher (parent chunk) level.
             */
            goNextChunk: function () {
                var children = $scope.editor.currentChunkInfo.children;
                if (children) {
                    selectTocNode(children[0].id);
                } else if ($scope.editor.currentChunkInfo.nextSib) {
                    this.goNextSection();
                } else {
                    this.goNextChunk1($scope.editor.currentChunkInfo);
                }
            }
        },
        /* End pagination controls */

        workDirectory: undefined,

        setContent: function (chunkInfo) {
            var layout = $scope.editor.engine.workTypeLayouts[chunkInfo.dataType];
            if (layout) {
                $scope.editor.pager.currentSection = chunkInfo.index;
                $scope.editor.pager.totalSections = chunkInfo.siblingCount;
                $scope.editor.currentChunkInfo = chunkInfo;
                layout(chunkInfo, $scope.editor.workTitle);
            } else {
                console.trace({type: 'fatal', msg: 'Invalid work chunk layout type "' + chunkInfo.dataType + '"'});
            }
        },

        /**
         * Activates settings. Removes current settings.
         * @param settings The editor's settings object.
         */
        activateSettings: function (settings) {

            function activateSettingStyles() {
                var styles = $('#d_styles');
                if (!styles || styles.length === 0) { // TODO just insert into DOM
                    throw {type: 'fatal', msg: 'Default styles (id d_styles) missing'};
                }
                var className;
                var style;
                var html = '';
                for (className in settings.styleSpecs) {
                    if (settings.styleSpecs.hasOwnProperty(className)) {
                        style = settings.styleSpecs[className];
                        html += style + ' ';
                    }
                }
                styles[0].innerHTML = html;
            }

            activateSettingStyles();
        },

        // stub function to do a test annotation
        test: function () {
            var viewMethName;
            for (viewMethName in testAnnotation.views) {
                if (testAnnotation.views.hasOwnProperty(viewMethName)) {
                    var viewMeth = $scope.editor.engine.viewMethods[viewMethName];
                    if (viewMeth) {
                        viewMeth($scope, testAnnotation);
                    } else {
                        throw {type: 'fatal', msg: 'No view method named "' + viewMethName + '"'};
                    }
                }
            }
        },

        // stub function to clear all annotation views
        clearAnnotationViews: function () {
            $(EditorSettings.nodeNames.selectionSpan).each(function (i) {
                var child = $(this)[0].firstChild;
                $(this).replaceWith(child);

            });
        }
    };
    /* Editor specs in presentation order */
    $scope.editor.editorMenu.list = [
        $scope.editor.editorMenu.openToc,
        $scope.editor.editorMenu.showNotes,
        $scope.editor.editorMenu.statistics
    ]

    // Set the editor engine to use
    $scope.editor.engine = EditorEngine2;

    // Set the user preferences
    $scope.editor.prefs = UserPrefs;

    $scope.editor.openCreateNoteDialog = function (sid, selection) {

        var modalInstance = $modal.open({
            templateUrl: 'views/createNoteDialog.html',
            controller: CreateNoteDialogCtrl,
            resolve: {
                params: function () {
                    return {
                        sid: sid,
                        selection: selection
                    };
                }
            }
        });

        modalInstance.result.then(function (selectedItem) {
            $scope.selected = selectedItem;
        }, function () {
            console.info('Modal dismissed at: ' + new Date());
        });
    };

});
/* End WorkCtrl */


var CreateNoteDialogCtrl = function ($scope, $modalInstance, params) {

    params.range = params.selection.getRangeAt(0);
    $scope.selection = params.selection.toString();
    $scope.ok = function () {
        markupNoteSelection(params);
        showNote(params.sid)
        $modalInstance.close(); // TODO can I pass something to close?
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};