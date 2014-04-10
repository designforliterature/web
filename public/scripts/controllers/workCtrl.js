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


horaceApp.controller('WorkCtrl', function ($scope, EditorEngine, AnnotationService, WorkDirectoryService, EditorSettings, UserPrefs, $stateParams, $modal, $http) {

    function makeJtreeData(toc, jtreeData) { // TODO deal with a huge outline // TODO make recursive for all levels
        for (var i in toc) {
            var chunk = toc[i],
                toplevelItem = {id: chunk.id, icon: false, text: chunk.title};
            jtreeData.push(toplevelItem);
            if (chunk.children && chunk.children.length !== 0) {
                toplevelItem.children = [];
                makeJtreeData(chunk.children, toplevelItem.children);
            }
        }
    }

    /**
     * On mouseup in the content area with the alt key depressed,
     * the user intends to create a note.
     * Scheme:
     * Option (PCs: AltKey) + mouseUp: create a simple note
     * TODO Option (PCs: AltKey) + Shift + mouseUp: create a more complex note: dialog brings up options
     * @param e The event
     */
    $('#editorContent')[0].onmouseup = function (e) {
        if (e.altKey) { // Option key creates a note
            makeNote(e);
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
    function makeNote(e) {
        $('#editorContent')[0].normalize(); // get rid of empty and merge sibling text nodes
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection(),
                chunkInfo = $scope.editor.currentChunkInfo;
            if (sel.rangeCount) {
                if (sel.isCollapsed) {
                    console.info('nothing selected');
                } else {
                    chunkInfo.maxSid += 1;
                    $scope.editor.openMakeNoteDialog(chunkInfo.maxSid.toString(), sel);
                }
            }
        } else {
            alert('This browser is not supported')
        }
    }

    /* Execute after document loads */
    $scope.$on('$viewContentLoaded', function () {
        $http.get('catalog/work/chunk', {
            params: {
                id: $scope.editor.id
            }
        }).success(function (response) {
                if (response.type === 'ack') {
                    if (response.content) {
                        try {
                            $scope.editor.activateSettings(EditorSettings);
                            $scope.editor.workDirectory = new WorkDirectoryService.Directory(response.content);
                            $scope.editor.pager.rootChidrenCount = $scope.editor.workDirectory.getRootChildrenCount();
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
            }).error(function (error) {
                console.trace(error); // TODO handle real error
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

        /* id: The id of the chunk to go to when this page is reached */
        id: $stateParams.id,

        /* The currently layed out chunk */
        currentChunkInfo: undefined,

        /* The title of the currently selected work */
        workTitle: undefined,

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
                    title: 'Hide Notes',
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

        /* Start pagination controls */
        pager: {
            currentSection: undefined,
            rootChidrenCount: undefined,
            setSection: function () {
                var newPageNo;
                try {
                    newPageNo = parseInt($('#currentSection')[0].value, 10);
                } catch (err) {
                    return; // ignore
                }
                if (newPageNo && newPageNo > 0 && newPageNo <= this.rootChidrenCount && newPageNo !== this.currentSection) {
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

        /**
         * Sets and lays out the content in HTML.
         * @param chunkInfo The chunk information
         */
        setContent: function (chunkInfo) {
            var layout = $scope.editor.engine.workTypeLayouts[chunkInfo.dataType];
            if (layout) {
                // Set the location in the TOC navigator
                $scope.editor.pager.currentSection = chunkInfo.index;
                $scope.editor.pager.rootChidrenCount = chunkInfo.siblingCount;
                $scope.editor.currentChunkInfo = chunkInfo;
                // Layout the HTML text
                layout(chunkInfo, $scope.editor.workTitle);
            } else {
                console.trace({type: 'fatal', msg: 'Invalid work chunk layout type "' + chunkInfo.dataType + '"'});
            }
        },

        /**
         * Exports the HTML content into a canonical chunk representation of the content.
         * chunkInfo.content is modified with the new content array.
         * The chunk representation for the content's only XML markup
         * are the selection start/end tags. All other XML markup is stripped out.
         */
        exportContent: function (chunkInfo) {
            var exporter = $scope.editor.engine.workTypeExporters[chunkInfo.dataType];
            if (exporter) {
                exporter(chunkInfo);
            } else {
                console.trace({type: 'fatal', msg: 'Invald work chunk export type "' + chunkInfo.dataType + '"'});
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

    $scope.editor.openMakeNoteDialog = function (sid, selection) {

        if (selection.toString() !== '\n') {

            var modalInstance = $modal.open({
                templateUrl: 'views/makeNoteDialog.html',
                controller: MakeNoteDialogCtrl,
                resolve: {
                    note: function () {
                        var p = {
                            selection: selection,
                            workControllerScope: $scope // The work controller's scope
                        };
                        p[dflGlobals.annotation.attributeNames.selectionId] = sid;
                        return p;
                    }
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            }, function () {
                console.info('Modal dismissed at: ' + new Date());
            });
        }
    };

    /**
     * Saves (or updates) the note.
     * @param note  The note
     */
    $scope.editor.saveNote = function (note) {

        // Marks up the content
        EditorEngine.markupNoteSelection(note, note.workControllerScope.editor.exportContent);

        AnnotationService.saveNote(note, function (error, response) {
            // TODO will need to erconcie on error
            if (!error) {
                // Enables highlighting and popups
                EditorEngine.enableNote(note)
            }
        });
    };

});
/* End WorkCtrl */


var MakeNoteDialogCtrl = function ($scope, $modalInstance, note, EditorEngine, AnnotationService) {

    var tooltipPlacements = [ // Menu of possible tooltip placements
            {name: 'None', code: 'none'}, // default: no tooltip
            {name: 'Top', code: 'top'},
            {name: 'Bottom', code: 'bottom'},
            {name: 'Left', code: 'left'},
            {name: 'Right', code: 'right'}
        ],
        tooltipMethods = [ // Menu of possible enabling methods for tooltip
            {name: 'Hover', code: null}, // default: enable tooltip when pointer hovers over text
            {name: 'Click', code: 'click'}
//            {name: 'Focus', code: 'blur'}
        ];

    $scope.makeNote = {
        selection: note.selection.toString(),
        text: '', // Model for the note's text
        tooltipPlacements: tooltipPlacements,
        tooltipPlacement: tooltipPlacements[0], // user-selected tooltip placement
        tooltipMethods: tooltipMethods,
        tooltipMethod: tooltipMethods[0] // user-selected tooltip method
    };

    // Pass the range, which is not volatile, but selection might be (pass a clone, maybe?)
    note.range = note.selection.rangeCount && note.selection.getRangeAt(0);

    $scope.ok = function () {
        try {
            note.tooltipPlacement = $scope.makeNote.tooltipPlacement.code; // ($scope.makeNote.tooltipPlacement.code && ($scope.makeNote.tooltipPlacement.code !== 'none')) ? $scope.makeNote.tooltipPlacement.code : undefined;
            note.tooltipMethod = $scope.makeNote.tooltipMethod.code;
            note.text = $scope.makeNote.text;
            note.chunkInfo = note.workControllerScope.editor.currentChunkInfo; // convenience

            note.workControllerScope.editor.saveNote(note);
        } catch (err) {
            alert('Error: ' + err); // TODO
        }
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};