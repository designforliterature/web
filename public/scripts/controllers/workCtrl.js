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


horaceApp.controller('WorkCtrl', function ($scope, EditorEngine, WorkDirectoryService, EditorSettings, UserPrefs, $stateParams, $modal) {

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
     * Scheme:
     * AltKey + mouseUp: create a simple note
     * AltKey + Shift + mouseUp: create a more complex note: dialog brings up options
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
//                    EditorEngine.markupNoteSelection(sel); // if it were done immediately
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
//

        /* drawer: contains table of contents and perhaps other aids */
        drawer: drawer,

        contentEditorMenu: {
            /**
             *  editorMenu: dropdown for content view.
             *  IMPORTANT: update editorMenu.list (below) when adding items to this
             */
            editorMenu: {
                openToc: {
                    title: 'TOC',
                    type: 'normal',
                    onSelect: function () {
                        $scope.editor.drawer.toggle();
                    }
                },
                /* Turns the contents into either a page or scroll view for the section.
                 * In page view, overflow goes into separate pages. Toc changes accordingly. */
                scrollOrPage: {
                    title: 'Scroll View',
                    type: 'checkbox',
                    selected: true, // model (initial state)
                    onSelect: function () {
                        alert('Scroll/Page View not implemented. Selected = ' + this.selected)
                    }
                },
                hideNotes: {
                    title: 'Notes Hidden',
                    type: 'checkbox',
                    selected: false, // model (initial state)
                    onSelect: function () {
                        alert('Hide Notes not implemented'); // TODO get actual sid
                    }
                },
                printContent: {
                    title: 'Print Content',
                    type: 'normal',
                    onSelect: function () { // print content DOM to console
                        var range = document.createRange(),
                            div = document.createElement('div');
                        range.selectNodeContents($('#editorContent')[0]);
                        div.appendChild(range.cloneContents());
                        console.info(div);
                    }
                },
                statistics: {
                    title: 'Statistics',
                    type: 'normal',
                    onSelect: function () {
                        alert('Statistics not implemented'); // TODO
                    }
                }
            },

            // TODO the following is not used but they are required by dropdownMenu directive
            selected_items: []
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
    $scope.editor.contentEditorMenu.list = [
        $scope.editor.contentEditorMenu.editorMenu.openToc,
        $scope.editor.contentEditorMenu.editorMenu.scrollOrPage,
        $scope.editor.contentEditorMenu.editorMenu.hideNotes,
        $scope.editor.contentEditorMenu.editorMenu.printContent,
        $scope.editor.contentEditorMenu.editorMenu.statistics
    ]

    // Set the editor engine to use
    $scope.editor.engine = EditorEngine;

    // Set the user preferences
    $scope.editor.prefs = UserPrefs;

    $scope.editor.openCreateNoteDialog = function (sid, selection) {

        if (selection.toString() !== '\n') {

            var modalInstance = $modal.open({
                templateUrl: 'views/createNoteDialog.html',
                controller: CreateNoteDialogCtrl,
                resolve: {
                    params: function () {
                        return {
                            sid: sid,
                            selection: selection,
                            scope: $scope // The content's scope
                        };
                    }
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            }, function () {
                console.info('Modal dismissed at: ' + new Date());
            });
        }
        ;
    }

});
/* End WorkCtrl */


var CreateNoteDialogCtrl = function ($scope, $modalInstance, params, EditorEngine) {

    var tooltipPlacements = [ // Menu of possible tooltip placements
        {name: 'Top', code: 'top'},
        {name: 'Bottom', code: 'bottom'},
        {name: 'Left', code: 'left'},
        {name: 'Right', code: 'right'}
    ];

    // TODO gather scope vars as members of a single scope var
    $scope.createNote = {
        selection: params.selection.toString(),
        useTooltip: true, // whether tooltips should be used
        tooltipPlacements: tooltipPlacements,
        tooltipPlacement: tooltipPlacements[0] // user-selected tooltip placement
    };

    // Pass the range, which is not volatile, but selection might be (pass a clone, maybe?)
    params.range = params.selection.rangeCount && params.selection.getRangeAt(0);

    $scope.ok = function () {
        params.tooltip = $scope.createNote.useTooltip;
        params.tooltipPlacement = ($scope.createNote.tooltipPlacement && $scope.createNote.tooltipPlacement.code);
        params.note = $('#note')[0].value;
        console.info('NOTE: ' + params.note);
        // Marks up the selection (persistent)
        EditorEngine.markupNoteSelection(params);
        // Creates highlights, popups, etc. (non-persistent)
        EditorEngine.showNote(params)
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};