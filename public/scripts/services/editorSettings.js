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
 * The editor's settings for a user.
 * These include the name of editor tags,
 * how the tags will be styled, and xpaths for finding
 * specific structures within the editor's DOM.
 */
horaceApp.service('EditorSettings', ['$compile', function ($compile) {

    return {

        xpaths: {
            /* Specify xpath elements for finding editor structures. Each is an array of xpath expressions.  */

            findSelectors: ['//D_SS', '//D_SE'] /* Used to search for selectors */
        },

        /* everyNLines: every how many lines to number presented text */
        everyNLines: 5,

        /* lineNumberingOn: if true, line numbering is on */
        lineNumberingOn: true,

        /* nodeNames: names of special nodes used to mark content */
        nodeNames: dflGlobals.annotation.nodeNames,

        /* styleSpecs: TODO */
        styleSpecs: dflGlobals.annotation.styleSpecs

    };
}
]);
