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

        nodeNames: dflGlobals.annotation.nodeNames,

        styleSpecs: dflGlobals.annotation.styleSpecs

    };
}
]);
