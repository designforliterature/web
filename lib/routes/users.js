/**
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

// SERVER SIDE --------------------------------------------------------------------------------------------

/**
 * Routes for users and groups.
 */
"use strict";

// TODO isolate vars from global namespace

var db = require('../db/mongoDbManager.js'),
    appUtils = require('../utilities/generalUtils.js');

module.exports = function users(app) {

    var session = app.get('session'),
        hogan = require('hjs');

    if (!session || !db || !hogan) {
        throw {type: 'fatal', msg: 'System not properly initialized'};
    }

    /* User session methods: signin, signup, etc. */
    app.namespace('/session', function () {

        /* Default: Check whether user is signed in or not */
        app.get('/', function (req, res) {
            var s = req.session, ack = {type: 'ack'};
            if (s && s.username) {
                ack.username = s.username;
            }
            res.json(ack);
        });

        /* User signin request */
        app.put('/', function (req, res) {
            var body = req.body;
            if (!body.name || !body.password) {
                res.json({type: 'error', msg: 'Missing username and/or password'});
            } else {
                db.findUserByUsername(body.name,
                    function (err, userRec) {
                        if (err) {
                            res.json(appUtils.makeError(err));
                        } else { // TODO encrypt password
                            if (userRec && userRec.username === body.name && userRec.password === body.password) {
                                req.session.username = userRec.username; // how we know user is signed in (auto-written to DB)
                                res.json({type: 'ack'});
                            } else {
                                res.json({type: 'error', msg: "Username and/or password don't match any user"});
                            }
                        }
                    });
            }
        });

        /* User signoff */
        app.get('/signoff', function (req, res) {
            delete req.session.username;
            res.json({type: 'ack', msg: 'User signed off'});
        });

        /* User signup request with automatic signin */
        app.post('/', function (req, res) {
            var body = req.body;
            if (!body.name || !body.password || !body.email) {
                res.json({type: 'error', msg: 'Missing required fields'});
            } else { // TODO encrypt password
                db.singupUser({username: body.name, password: body.password, email: body.email},
                    function (err, doc) {
                        if (err) {
                            res.json(appUtils.makeError(err));
                        } else {
                            req.session.username = body.name; // how we know user is signed in (auto-written to DB)
                            res.json({type: 'ack', msg: 'Signed up user ' + body.name});
                        }
                    });
            }
        });

    });

    app.namespace('/users', function createUserRoutes() {


        app.get('/new/:name', function (req, res) {
            try {
                req.session.user = req.params.user;
                res.send('<p>I just set session user to ' + req.params.name + '. Go <a href=".">Here</a> to see its value.</p>');
            } catch (err) {
                throw {type: 'trans', msg: err};
            }
            //res.cookie('user', req.params.name).send('<p>I just set cookie user to ' + req.params.name + '. Go <a href=".">Here</a> to see its value.</p>');
        });

        app.get('/new', function (req, res) {
            res.send(req.session.user);
            /* res.clearCookie('user');
             res.send('cookie cleared');*/
        });

        app.get('/edit/:id', function (req, res) {
            res.send('edit user ' + req.params.id);
        });

        app.get('/delete/:id', function (req, res) {
            res.send('delete user ' + req.params.id);
        });

        app.get('/19', function (req, res) {
//                var template = '{{#students}} <p>Name: {{name}}, Age: {{age}} years old</p> {{/students}}';
//                var context = {students: [{name: 'Ruben', age: 60},{name: 'Bev', age: 64}]};
//
//                var template = hogan.compile(template);
            var template = hogan.fcompile('./src/views/index.hjs', {delimiters: '<% %>'});
            res.send(template.render({msg: 'hogan works!'}));
//                res.render('./index.hjs');
        });

        // Namespaces can be nested
        app.namespace('/2013/jan', function () {

            app.get('/', function (req, res) {
                res.send('user from jan 2013');
            });

            app.get('/nodejs', function (req, res) {
                res.send('user about Node from jan 2013');
            });
        });
    });
};
