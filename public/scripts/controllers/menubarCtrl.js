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
 * Controls the catalog behavior (search, create, update).
 */

horaceApp.controller('MenubarCtrl', function ($scope, $http, $state, SessionService) {

    // Immediate check. Done here because this is when the menubar elements that
    // depend on session state exist.
    SessionService.checkSessionState();

    $scope.menubar = {

        goSignIn: function () {
            $state.go('signin');
        },

        signOff: function () {
            $http.get('/session/signoff')
                .success(function (res, status, headers, config) {
                    if (status === 200) {
                        dflGlobals.session.signedIn = false;
                        $("*[menu*='inSessionMenu']").css('display', 'none');
                        $("*[menu*='nonSessionMenu']").css('display', 'inline');
                        $state.go('signin');
                    } else {
                        console.trace('could not sign in'); // TODO
                    }
                })
                .error(function (err, status, headers, config) {
                    console.trace(err);
                });
        },

        goCatalog: function () {
            $state.go('catalog');
        }
    };
});