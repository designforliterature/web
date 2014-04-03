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

horaceApp.service('UserPrefs', function () {
    var prefs = {
        lang: { /* Language preferences */
            // TODO languages should ultimately be drawn from shared.js
            read: ['en', 'fr'], /* Preferably, user reads English, then French */
            write: ['en']       /* By default, user writes in English */
        }
    };
    return prefs;
}
);
