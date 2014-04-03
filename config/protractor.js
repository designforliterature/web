/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

'use strict';

exports.config = {

    seleniumAddress: 'http://localhost:4444/wd/hub',

    // Capabilities to be passed to the webdriver instance.
    capabilities: {
        'browserName': 'chrome'
    },

    // Spec patterns are relative to the current working directly when
    // protractor is called.
    specs: ['../test/e2e/testSignin.js'],

    // Options to be passed to Jasmine-node.
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 30000
    },

    // ----- More information for your tests ----
    //
    // A base URL for your application under test. Calls to protractor.get()
    // with relative paths will be prepended with this.
    baseUrl: 'http://localhost:3000',

    // Selector for the element housing the angular app - this defaults to
    // body, but is necessary if ng-app is on a descendant of <body>
    rootElement: 'body'

    // A callback function called once protractor is ready and available, and
    // before the specs are executed
    // You can specify a file containing code to run by setting onPrepare to
    // the filename string.
//    onPrepare: function() {
        // At this point, global 'protractor' object will be set up, and jasmine
        // will be available. For example, you can add a Jasmine reporter with:
        //     jasmine.getEnv().addReporter(new jasmine.JUnitXmlReporter(
        //         'outputdir/', true, true));
//    },

    // The params object will be passed directly to the protractor instance,
    // and can be accessed from your test. It is an arbitrary object and can
    // contain anything you my need in your test.
    // This can be changed via the command line as:
    //   --params.login.user 'Joe'
//    params: {
//        login: {
//            user: 'Jane',
//            password: '1234'
//        }
//    },
};
