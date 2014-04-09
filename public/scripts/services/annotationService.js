/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */


/* CLIENT SIDE ------------------------------------------------------------------------------------- */

'use strict';

/**
 * AnnotationService
 *
 * Handles the life-cycle of annotations.
 */
horaceApp.service('AnnotationService', ['$http', function ($http) {

    return {

        /**
         * Creates or updates a note.
         * Steps:
         * 1. For each annotated chunk, this function's client will create a selection id greater
         *    than the current selection id for a chunk.
         * 2. The client will mark up the text of each chunk with the new selection ids.
         * 3. If the chunks's selection ids are consistent in the DB with the client's newly created ones
         *    by the client, the transaction will succeed. Both the text for the chunks and the selection
         *    ids will be updated in the DB and the callback succeeds.
         * 4. However, if the selection ids in the DB are inconsistent with
         *    the client's ids, the transaction fails (due to a potential overwrite of
         *    another user's note). The affected chunk caches are then
         *    refreshed (with the new text and current selection ids) and the callback is called
         *    with a non-fatal error that lets the client try again.
         * @param note  The note metadata.
         * @param callback A callback
         */
        saveNote: function (note, callback) {
            console.info(note);
            var response = {};
            callback(response);
        },

        /**
         * Returns a single note.
         */
        getNote: function () {

        },

        /**
         * Returns all notes for a specified chunk.
         */
        getNotes: function () {

        }

    };
}]);

