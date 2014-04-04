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
         * @param note  The note metadata.
         */
        saveNote: function (note) {
            console.info(note);
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

