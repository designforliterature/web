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

// Handles the signup profile data.
horaceApp.controller('SignupCtrl', function ($scope, $http, $state) {

    // Provided for the benefit of directives
    $scope.dfl_scopeFieldName = 'signup';

    $scope.signup = {
        signup: function () {
            var user = $scope.signup.user;
            $http.post('/session', user)
                .success(function (res) {
                    dflGlobals.debug(res);
                    if (res.type === 'ack') {
                        $state.go('catalog');
                    } else {
                        $scope.signup.user.name = '';
                        $scope.signup.user.password = '';
                        $scope.signup.user.email = '';
                        $scope.signup.user.password = '';
                        $scope.signup.msg = 'No such user. Try again';
                        $scope.signup.error = true;
                    }
                })
                .error(function (res) {
                    dflGlobals.debug(res);
                    $scope.signup.msg = 'Technical Problem: Please retry';
                    $scope.signup.error = true;
                });
        }
    };
});
/* End SignupCtrl */