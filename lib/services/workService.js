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


/* Require MongoDB implementation */
var store = require('../store/storeManager.js');

var workService = {

    getChunk: function (chunkId, callback) {
        store.getChunk(chunkId, callback);
    },

    addNote: function (note, callback) {
        store.addNote(note, callback);
    }
};

exports.workService = workService;