/*
 The MIT License (MIT)

 Copyright (c) 2014 Ruben Kleiman

 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

'use strict';

/**
 * Controls user signin behavior. The user is first routed to the signin view.
 */

horaceApp.controller('SigninCtrl', function ($scope, $http, $state) {

    // Provided for the benefit of directives
    $scope.dfl_scopeFieldName = 'signin';

    // If user is signed in, redirect to the "home" view.
    if (dflGlobals.session.signedIn) {
        $state.go('catalog');
    }

    $scope.signin = {

        /**
         * signIn: called when user completes signin form.
         * If signin is ok, goes to "home" page.
         */
        signIn: function () {
            var user = $scope.signin.user;
            $http.put('/session', user)
                .success(function (res) {
                    horaceApp.debug(res);
                    if (res.type === 'ack') {
                        $state.go('catalog');
                    } else {
                        $scope.signin.user.name = '';
                        $scope.signin.user.password = '';
                        $scope.signin.msg = 'No such user. Try again';
                        $scope.signin.error = true;
                    }
                })
                .error(function (res) {
                    horaceApp.debug(res);
                    $scope.signin.msg = 'Technical Problem: Please retry';
                    $scope.signin.error = true;
                });
        }
    };
});
/* End SigninCtrl */