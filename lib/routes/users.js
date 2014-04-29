/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// SERVER SIDE --------------------------------------------------------------------------------------------

/**
 * Routes for users and groups.
 */
"use strict";

// TODO isolate vars from global namespace

var db = require('../db/mongoDbManager.js'),
    generalUtils = require('../utilities/generalUtils.js');

module.exports = function users(app) {

    var session = app.get('session'),
        hogan = require('hjs');

    if (!session || !db || !hogan) {
        throw new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'System not properly initialized');
    }

    /* User session methods: signin, signup, etc. */
    app.namespace('/session', function () {

        /* Default: Check whether user is signed in or not */
        app.get('/', function (req, res) {
            var s = req.session, ack = new generalUtils.DFLCondition(generalUtils.DFLCondition.ack);
            if (s && s.username) {
                ack.username = s.username;
            }
            res.json(ack);
        });

        /* User signin request */
        app.put('/', function (req, res) {
            var body = req.body;
            if (!body.name || !body.password) {
                res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'Missing username and/or password params'));
            } else {
                db.findUserByUsername(body.name,
                    function (err, userRec) {
                        if (err) {
                            res.json(generalUtils.makeError(err));
                        } else { // TODO encrypt password
                            if (userRec && userRec.username === body.name && userRec.password === body.password) {
                                req.session.username = userRec.username; // how we know user is signed in (auto-written to DB)
                                res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.ack));
                            } else {
                                res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, "Username and/or password don't match any user")); // i18n
                            }
                        }
                    });
            }
        });

        /* User signoff */
        app.get('/signoff', function (req, res) {
            delete req.session.username;
            res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.ack, 'User signed off'));
        });

        /* User signup request with automatic signin */
        app.post('/', function (req, res) {
            var body = req.body;
            if (!body.name || !body.password || !body.email) {
                res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Missing required fields'));
            } else { // TODO encrypt password
                db.singupUser({username: body.name, password: body.password, email: body.email},
                    function (err, doc) {
                        if (err) {
                            res.json(generalUtils.makeError(err));
                        } else {
                            req.session.username = body.name; // how we know user is signed in (auto-written to DB)
                            res.json(new generalUtils.DFLCondition(generalUtils.DFLCondition.ack, 'Signed up user ' + body.name));
                        }
                    });
            }
        });

    });


//    app.namespace('/users', function createUserRoutes() {
//
//
//        app.get('/new/:name', function (req, res) {
//            try {
//                req.session.user = req.params.user;
//                res.send('<p>I just set session user to ' + req.params.name + '. Go <a href=".">Here</a> to see its value.</p>');
//            } catch (err) {
//                throw new generalUtils.DFLCondition(generalUtils.DFLCondition.trans, err);
//            }
//            //res.cookie('user', req.params.name).send('<p>I just set cookie user to ' + req.params.name + '. Go <a href=".">Here</a> to see its value.</p>');
//        });
//
//        app.get('/new', function (req, res) {
//            res.send(req.session.user);
//            /* res.clearCookie('user');
//             res.send('cookie cleared');*/
//        });
//
//        app.get('/edit/:id', function (req, res) {
//            res.send('edit user ' + req.params.id);
//        });
//
//        app.get('/delete/:id', function (req, res) {
//            res.send('delete user ' + req.params.id);
//        });
//
//        app.get('/19', function (req, res) {
////                var template = '{{#students}} <p>Name: {{name}}, Age: {{age}} years old</p> {{/students}}';
////                var context = {students: [{name: 'Ruben', age: 60},{name: 'Bev', age: 64}]};
////
////                var template = hogan.compile(template);
//            var template = hogan.fcompile('./src/views/index.hjs', {delimiters: '<% %>'});
//            res.send(template.render({msg: 'hogan works!'}));
////                res.render('./index.hjs');
//        });
//
//        // Namespaces can be nested
//        app.namespace('/2013/jan', function () {
//
//            app.get('/', function (req, res) {
//                res.send('user from jan 2013');
//            });
//
//            app.get('/nodejs', function (req, res) {
//                res.send('user about Node from jan 2013');
//            });
//        });
//    });
};
