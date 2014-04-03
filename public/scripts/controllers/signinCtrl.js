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
 * Controls user signin behavior. The user is first routed to the signin view.
 */

horaceApp.controller('SigninCtrl', function ($scope, $http, $state) {

    // Provided for the benefit of directives
    $scope.dfl_scopeFieldName = 'signin';

    // If user is signed in, redirect to the "home" view.
//    if (dflGlobals.session.signedIn) {
//        console.info('about to go to catalog from signin page');
//        $state.go('catalog');
//    }

    $scope.signin = {

        /**
         * signIn: called when user completes signin form.
         * If signin is ok, goes to "home" page.
         */
        signIn: function () {
            var user = $scope.signin.user;
            $http.put('/session', user)
                .success(function (res) {
                    dflGlobals.debug(res);
                    if (res.type === 'ack') {
                        $("*[menu*='inSessionMenu']").css('display', 'inline');
                        $("*[menu*='nonSessionMenu']").css('display', 'none');
                        $state.go('catalog');
                    } else {
                        $scope.signin.user.name = '';
                        $scope.signin.user.password = '';
                        $scope.signin.msg = 'No such user. Try again';
                        $scope.signin.error = true;
                    }
                })
                .error(function (res) {
                    dflGlobals.debug(res);
                    $scope.signin.msg = 'Technical Problem: Please retry';
                    $scope.signin.error = true;
                });
        }
    };
});
/* End SigninCtrl */