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
    // TODO re-enable timeout when sessions become important
//    var checkSessionStateTimeout = function () {
//        checkSessionState();
//        $timeout(checkSessionStateTimeout, 5000);
//    };
//    $timeout(checkSessionStateTimeout, 5000);


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