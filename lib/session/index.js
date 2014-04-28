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
 * session/index.js
 *
 * Supports session-based sockets. Allows client to
 * access the session when the socket is known.
 */

"use strict";

var config,
    generalUtils = require('../utilities/generalUtils.js');

/* SessionSockets: code borrowed from session.socket.io and integrated here */
var SessionSockets = function (io, sessionStore, cookieParser, sessionKey) {
    if (!sessionKey) {
        throw new generalUtils.DFLCondition('fatal', 'Missing session key');
    }

    this.getSession = function (socket, callback) {
        if (!socket) {
            throw new generalUtils.DFLCondition('fatal', 'socket is not defined');
        }
        cookieParser(socket.handshake, {}, function (parseErr) {
            if (!socket) {
                callback(new generalUtils.DFLCondition('trans', 'socket not defined in cookieParser'));
                return;
            }
            var handshake = socket.handshake;
            var cookie = (handshake &&
                (handshake.secureCookies && handshake.secureCookies[sessionKey]) ||
                (handshake.signedCookies && handshake.signedCookies[sessionKey]) ||
                (handshake.cookies && handshake.cookies[sessionKey]));
            if (!cookie) {
                callback(new generalUtils.DFLCondition('trans', 'Could not find cookie session id ' + sessionKey));
                return;
            }
            sessionStore.load(cookie, function (storeErr, session) {
                var err = parseErr || storeErr || null;
                if (!err && !session) {
                    err = new generalUtils.DFLCondition('trans', 'Could not lookup session by key: ' + sessionKey);
                }
                callback(err, session);
            });
        });
    };
};

/**
 * Configures session cookie management
 * @param app The application
 */
var use = function (app, io, cookieParser, sessionKey) {
    // TODO this creates a new connection, but we should really share our existing one by passing it in db instead of url
    //  I tried this but there were some problems not worth the hassle for a demo
    config = app.get('config');
    var db = app.get('db'),
        express = require('express'),
        url = db.makeDbUrl(config.db, config.db.sessionDb),
        SessionStore = require('connect-mongodb'),
        store = new SessionStore({url: url});
    if (!store) {
        throw new generalUtils.DFLCondition('fatal', 'Session store not created for url=' + url);
    }
    app.use(express.session({store: store, key: config.rest.session.key, secret: config.rest.session.secret, cookie: {maxAge: config.rest.session.maxAge}}));

    if (config.rest.session.verbose) {
        console.log('Configured Session: db=' + config.db.sessionDb + " key=" + config.rest.session.key + " secret=" + config.rest.session.secret + " maxAge=" + config.rest.session.maxAge);
    }

    // Now let sockets keep the current session
    return new SessionSockets(io, store, cookieParser, sessionKey);
};

exports.use = use;


/**
 * TODO get rid of this sample code (used by users.js router)
 * Default handler for basic session state.
 * Handles view count, etc.
 * @param req   The http request
 * @param res   The http response
 * @param next  Optional next closure for handling http transaction
 */
exports.handle = function (req, res, next) {
    var sess = req.session;
    if (!sess) {
        throw new generalUtils.DFLCondition('trans', 'Invalid session state: no session');
    } else {
        if (sess.views) {
            sess.views += 1;
        } else {
            sess.views = 1;
        }
        var last = (sess.lastAccess === undefined) ? null : new Date(JSON.parse(sess.lastAccess));
        if (config.rest.session.verbose) {
            console.log('Session ' + sess.id + ' lastAccess: ' + last + ' expires: ' + sess.cookie._expires + ' maxAge: ' + (sess.cookie.originalMaxAge / (1000 * 60)) + ' minutes' + ' views=' + sess.views);
        }
    }
    if (next) {
        next();
    }
};