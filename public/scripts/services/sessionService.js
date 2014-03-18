/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2013 Ruben Kleiman
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

/* CLIENT SIDE ------------------------------------------------------------------------------------- */

'use strict';

/**
 * Provides session management services
 */
horaceApp.service('SessionService', function ($timeout, $http, $state) {

    /**
     * checkSessionState: checks whether user is signed in or not.
     * If user is not signed in (session expired), transfers control to signin view.
     */
    function checkSessionState() {
        $http.get('/session/')
            .success(function (res) {
                if (res.type === 'ack' && res.username) {
                    dflGlobals.session.signedIn = true;
                    $("*[menu*='inSessionMenu']").css('display', 'inline');
                    $("*[menu*='nonSessionMenu']").css('display', 'none');
                    if ($state.is('signin')) {
                        $state.go('catalog');
                    }
                } else {
                    dflGlobals.session.signedIn = false;
                    $("*[menu*='inSessionMenu']").css('display', 'none');
                    $("*[menu*='nonSessionMenu']").css('display', 'inline');
                    if (!$state.is('work') && !$state.is('signup')) {
                        $state.go('signin');
                    }
                }
//                console.info('User session state: ' + (dflGlobals.session.signedIn ? 'SIGNED IN' : 'SIGNED OUT')); // dbg
            })
            .error(function (err) {
                console.trace(err); // TODO
            });
    }

    // Check whether user is signed in every few seconds
    var checkSessionStateTimeout = function () {
        checkSessionState();
        $timeout(checkSessionStateTimeout, 5000);
    };
    $timeout(checkSessionStateTimeout, 5000);


    return {
        /**
         * Checks whether the user is signed in or not. If
         * signed up, a global is set with this state and
         * the signoff menu item is enabled.
         * @param callback  An optional callback
         */
        checkSessionState: checkSessionState
    };
});