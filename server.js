/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */


/**
 * Web server entry point.
 *
 * Installation: see README.md
 *
 * Configuration: The server's configuration is specified in ./config/server-config.js
 *
 * Startup:
 *   1. Ensure DB is running (./scripts/start_db.js)
 *   2. Start node server (./scripts/run-webserver.js)
 *
 * To tweak V8 engine: node --v8-options
 */

"use strict";

var
// We use the express wrapper for REST and modularity of APIs
    express = require('express'),

// Websockets used for real-time interactions and notifications
    io = require('socket.io'),

// Make websockets session-aware
    sessionSockets,

// Path context
    path = require('path'),

// The database plugin. Here, we use MongoDB
    db = require('./lib/db/mongoDbManager.js'),

// The REST endpoints
    routes = require('./lib/routes'),

// Activate the express wrapper [after routes are available]
    app = express(),

// The persistent (DB-based) session manager
    session = require('./lib/session'),

    cookieParser,

// Our application's utilties, including error wrappers
    generalUtils = require('./lib/utilities/generalUtils.js'),

// The http server
    httpServer = require('http').createServer(app),

// Environment variables for node context
    env = app.get('env'),

// Our application server's configuration information for the current environment.
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
    app.use(express.bodyParser()); // Parse body params, etc.
    app.use(express.methodOverride());
//    app.use(express.logger());
    app.set('config', config); // Provide the app's configuration object
    app.set('db', db); // Provide DB handle
    app.set('session', session); // Provide session management handle
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
            throw err;
        } else { // Then initialize the router, which relies on our DB being initialized
            routes.use(app, function (err) {
                if (err) {
                    throw err;
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
