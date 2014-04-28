/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

/* To tweak V8:
 *  node --v8-options
 */

/**
 * web app entry point.
 */
"use strict";

var express = require('express'),
    path = require('path'),
    sessionSockets,
    io = require('socket.io'),

    db = require('./lib/db/mongoDbManager.js'),
    routes = require('./lib/routes'),
    session = require('./lib/session'),
    cookieParser,
    generalUtils = require('./lib/utilities/generalUtils.js'),

    app = express(),
    httpServer = require('http').createServer(app),
    env = app.get('env'),

    config = require('./config/server-config.js')(env);

console.info('Environment: %s\nLocation: %s\nConfiguration:\n',
    env, __dirname, JSON.stringify(config, null, 2));

// Configure express for all environments
app.configure(function () {
    if (env === 'development') {
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
    }
    app.use(express.bodyParser());
    app.use(express.methodOverride());
//    app.use(express.logger());
    app.set('dirname', __dirname); // Root directory name
    app.set('config', config); // Our app's configuration object
    app.set('db', db); // Our wrapper to the DB implementation
    app.set('routes', routes); // Our router
    app.set('session', session); // Our session management
    app.set('views', path.join(__dirname, 'lib/views'));  // Our app's views
    app.set('view engine', 'hjs'); // The HJS engine
    app.use(express.favicon(__dirname + '/app/images/favicon.ico'));
    app.use(express.cookieParser()); // Initialize cookie management
    cookieParser = express.cookieParser(config.rest.session.secret);
    sessionSockets = session.use(app, io, cookieParser, config.rest.session.key); // Initialize session management
    app.use(app.router); // Initialize REST routes
    app.use(express['static'](path.join(__dirname, 'public'))); // Configure our app's static page server
    db.use(app, function (err) { // First initialize our DB wrapper
        if (err) {
            console.error(err);
            throw new generalUtils.DFLCondition('fatal', 'DB not created: ' + err);
        } else {
            routes.use(app, function (err) { // Then initialize the router, which relies on our DB being initialized
                if (err) {
                    console.error(err);
                    throw new generalUtils.DFLCondition('fatal', 'Routes not created: ' + err);
                }
            });

            var ioLogLevel = {error: 0, warn: 1, info: 2, debug: 3}.warn; // Set socket.io lib log level
            require('./lib/routes/sockets.js').init(app, sessionSockets, httpServer, ioLogLevel); // Open websocket communications
        }
    });
});

var port = config.rest.port || process.env.DFL_SERVER_PORT || 80;

// Start the server
httpServer.listen(port);
console.info('HTTP server listening on port %d, environment=%s', port, env);

