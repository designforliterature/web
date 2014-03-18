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