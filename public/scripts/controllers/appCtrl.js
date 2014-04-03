/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

/**
 * This is the toplevel controller for the client.
 * All global-like behavior should be encapsulated here.
 */

'use strict';

/**
 * AppCtrl: root controller for the app.
 * Injects all services that must be instantiated when, e.g., any page is refreshed.
 */
horaceApp.controller('AppCtrl', function ($scope, $rootScope, $http, $state, SocketsService, SessionService) {

    // Connect websockets when client is (re-)loaded
    SocketsService.connectSockets();


//    $rootScope.$on('$stateChangeStart',
//        function (event, toState, toParams, fromState, fromParams) {
//            console.info(fromState.name + ' -> ' + toState.name); // dbg
//        });

    $scope.app =
    {
        /* menubar: include this view of the main menubar into the HTML page */
        menubar: 'views/menubar.html',

        /* license: Creative Commons license */
        license: 'views/license.html',

        /* serverStatus: get server status DBG ONLY TODO REMOVE */
        serverStatus: function (event) {
            $http.get('/sys/status')
                .success(function (res, status, headers, config) {
                    alert(res.msg);
                })
                .error(function (err, status, headers, config) {
                    console.trace(err);
                });
        }
    };

});
/* End AppCtrl */


