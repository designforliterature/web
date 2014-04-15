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
     * Returns an array of note types.
     * @param input Characters in the note type's name. All note types
     * are returned when input is undefined.
     * @param callback
     * @returns {*|Error}
     */
    function getNoteTypes(input, callback) {
        return $http.get('/note/type/json', {
            params: {
                input: input
            }
        })
            .success(function (res) {
                if (res.type === 'ack') {
                    callback(null, res.types);
                } else {
                    console.trace(res); // TODO
                    callback('error getting note types');
                }
            })
            .error(function (error) {
                console.trace(error); // TODO
                callback('error getting note types');
            });
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
                chunkInfo = $scope.editorModel.currentChunkInfo;
            if (sel.rangeCount) {
                if (sel.isCollapsed) {
                    console.info('nothing selected');
                } else {
                    chunkInfo.maxSid += 1;
                    $scope.editorModel.openMakeNoteDialog(chunkInfo.maxSid.toString(), sel);
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
                id: $scope.editorModel.currentChunkId
            }
        }).success(function (response) {
                if (response.type === 'ack') {
                    if (response.chunk) {
                        try {
                            $scope.editorModel.activateSettings(EditorSettings);
                            $scope.editorModel.workDirectory = new WorkDirectoryService.Directory(response.chunk);
                            $scope.editorModel.pager.rootChidrenCount = $scope.editorModel.workDirectory.getRootChunksCount();
                            $scope.editorModel.workTitle = response.chunk.workTitle;
                            var jtreeData = [],
                                jtreeToc = {
//                                    plugins: ['search'],
                                    core: {multiple: false, data: jtreeData}
                                };
                            makeJtreeData(response.chunk.toc, jtreeData);

                            $('#toc').jstree(jtreeToc);
                            $('#toc').on('changed.jstree', function (event, data) {
                                var chunkInfo = $scope.editorModel.workDirectory.getChunkInfo(data.node.id, function (err, chunkInfo) {
                                    $scope.editorModel.setContent(chunkInfo);
                                });
                            });
//                            $('#toc').on('hover_node.jstree', function (event, data) {
//                            });
                            // Set initial content TODO pick up "last location" from user history
                            $scope.editorModel.workDirectory.getChunkInfo(response.chunk.id, function (err, chunkInfo) {
                                $.jstree.reference('#toc').select_node(response.chunk.id);
                                $scope.editorModel.setContent(chunkInfo);
                            });
                        } catch (error) {
                            console.trace(error.message, error.stack); // TODO handle this
                        }
                    } else {
                        console.trace(response)
                        alert('no content'); // TODO handle this
                    }
                } else { // TODO handle development error
                    console.trace(response);
                }
            }).error(function (error) {
                console.trace(error); // TODO handle real error
            });

        getNoteTypes(undefined, function (err, noteTypes) {
            if (err) {
                console.trace(err); // TODO
            } else {
                $scope.editorModel.noteTypes = noteTypes; // TODO tmp cache
                $scope.editorModel.noteType = noteTypes[0];
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

    $scope.editorModel = {

        /* currentChunkId: The id of the chunk to go to when this page is reached */
        currentChunkId: $stateParams.id,

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
                        $scope.editorModel.drawer.toggle();
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
                    var currChunk = $scope.editorModel.currentChunkInfo,
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
                if ($scope.editorModel.currentChunkInfo.prevSib) {
                    selectTocNode($scope.editorModel.currentChunkInfo.prevSib.id);
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
                    chunkInfo = $scope.editorModel.currentChunkInfo;
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
                if ($scope.editorModel.currentChunkInfo.nextSib) {
                    selectTocNode($scope.editorModel.currentChunkInfo.nextSib.id);
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
                var children = $scope.editorModel.currentChunkInfo.children;
                if (children) {
                    selectTocNode(children[0].id);
                } else if ($scope.editorModel.currentChunkInfo.nextSib) {
                    this.goNextSection();
                } else {
                    this.goNextChunk1($scope.editorModel.currentChunkInfo);
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
            var layout = $scope.editorModel.engine.workTypeLayouts[chunkInfo.dataType];
            if (layout) {
                // Set the location in the TOC navigator
                $scope.editorModel.pager.currentSection = chunkInfo.index;
                $scope.editorModel.pager.rootChidrenCount = chunkInfo.siblingCount;
                $scope.editorModel.currentChunkInfo = chunkInfo;
                // Layout the HTML text
                layout(chunkInfo, $scope.editorModel.workTitle);
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
        }
    };

    /* Editor specs in presentation order */
    $scope.editorModel.contentEditorMenu.list = [
        $scope.editorModel.contentEditorMenu.editorMenu.openToc,
        $scope.editorModel.contentEditorMenu.editorMenu.scrollOrPage,
        $scope.editorModel.contentEditorMenu.editorMenu.hideNotes,
        $scope.editorModel.contentEditorMenu.editorMenu.printContent,
        $scope.editorModel.contentEditorMenu.editorMenu.statistics
    ]

    // Set the editor engine to use
    $scope.editorModel.engine = EditorEngine;

    // Set the user preferences
    $scope.editorModel.prefs = UserPrefs;

    $scope.editorModel.openMakeNoteDialog = function (sid, selection) {

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
    $scope.editorModel.saveNote = function (note) {

        // Marks up the content
        EditorEngine.markupNoteSelection(note);

        AnnotationService.saveNote(note, function (error, chunk) {
            if (!error) {
                // Enables highlighting and popups
                EditorEngine.enableNote(note)
            } else {
                // TODO will need to reconcile on error & try again using a new sid provided by the response
            }
        });
    };

});
/* End WorkCtrl */


var MakeNoteDialogCtrl = function ($scope, $http, $modalInstance, note, EditorEngine, AnnotationService) {

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

    $scope.makeNoteModel = {
        selection: note.selection.toString(),
        text: '', // Model for the note's text
        tooltipPlacements: tooltipPlacements,
        tooltipPlacement: tooltipPlacements[0], // user-selected tooltip placement
        tooltipMethods: tooltipMethods,
        tooltipMethod: tooltipMethods[0], // user-selected tooltip method
        types: note.workControllerScope.editorModel.noteTypes,
        type: note.workControllerScope.editorModel.noteTypes[0],
        hiliteColor: 'ffff00',

        selectedNoteType: function (noteType, $model, $label, fieldName) {
            $scope.makeNoteModel.type = noteType;
        }
    };

    // Pass the range, which is not volatile, but selection might be (pass a clone, maybe?)
    note.range = note.selection.rangeCount && note.selection.getRangeAt(0);

    $scope.ok = function () {
        try {
            if ($scope.makeNoteModel.text) {
                note.tooltipPlacement = $scope.makeNoteModel.tooltipPlacement.code;
                note.tooltipMethod = $scope.makeNoteModel.tooltipMethod.code;
                note.type = $scope.makeNoteModel.type.code;
                note.hiliteColor = $scope.makeNoteModel.hiliteColor;
                note.text = $scope.makeNoteModel.text;
                note.chunkInfo = note.workControllerScope.editorModel.currentChunkInfo; // convenience

                note.workControllerScope.editorModel.saveNote(note);
            } else {
                // do nothing
            }
        } catch (err) {
            alert('Error: ' + err); // TODO
        }
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};