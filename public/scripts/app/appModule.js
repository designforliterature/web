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
 * This is the client application's angular module.
 * Angular configuration (esp. routes) is done here.
 */

var horaceApp = angular.module('horaceApp', [
    'ui.router',
    'angularFileUpload',
    'ui.bootstrap',
//    'snap'
]);
/* End horaceApp module */

horaceApp.config(function ($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/signin') // default

    $stateProvider
        .state('signin', {
            controller: 'SigninCtrl',
            url: '/signin',
            templateUrl: '/views/signin.html'
        })
        .state('signup', {
            controller: 'SignupCtrl',
            url: '/signup',
            templateUrl: '/views/signup.html'
        })
        .state('work', {
            controller: 'WorkCtrl',
            url: '/work/?id&content',
            templateUrl: 'views/work.html'
        })
        .state('catalog', {
            controller: 'CatalogCtrl',
            url: '/catalog',
            templateUrl: '/views/catalog.html'
        })

// To configure html5 to get links working on jsfiddle:
//    $locationProvider.html5Mode(true);

});
/* End horaceApp Route Config */
