/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// SERVER SIDE --------------------------------------------------------------------------------------------

'use strict';

var generalUtils = require('../utilities/generalUtils.js'),
    store = require('../store/storeManager.js');

var workService = {

    getChunk: function (chunkId, callback) {
        store.getChunk(chunkId, callback);
    },

    addNote: function (note, callback) {
        store.addNote(note, callback);
    },

    noteTypes: [ // TODO get from db
        {name: 'Comment', value: 'comment', descr: 'A simple comment on the selected text'},
        {name: 'Translation', value: 'translation', descr: 'A translation of the selected text'},
        {name: 'Paraphrase', value: 'paraphrase', descr: 'A paraphrase of the selected text'},
        {name: 'Syntax', value: 'syntax', descr: 'A note on the syntax of the selected text'},
        {name: 'Meaning', value: 'meaning', descr: 'The meaning or semantics of the selected text'}
    ],

    /**
     * Searches for note types that are match the specified input or
     * retries all note types
     * @param query If query.input is undefined, then return all note types,
     * else return the note types that match query.input
     * @param callback
     */
    searchNoteType: function (query, callback) {
        try {
            var i, type, result = [];
            if (query.input) {
                query.input = query.input.toLowerCase();
            }
            for (i in workService.noteTypes) {
                type = workService.noteTypes[i];
                if (!query.input || type.code.indexOf(query.input) !== -1) {
                    result.push(type);
                }
            }
            callback(null, {type: 'ack', types: result});
        } catch (error) {
            callback(generalUtils.makeError(error));
        }
    }
};

exports.workService = workService;