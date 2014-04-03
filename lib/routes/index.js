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
 * Index page for http routers.
 */
"use strict";

require('express-namespace');

exports.use = function (app, cb) {

    /* Load routes */
    require('./sys.js')(app); // system calls (mostly debugging)
    require('./catalog.js')(app); // catalog metadata and content entry and search
    require('./users.js')(app);  // user signin, signup, and profile settings/info


    var nodeUtils = require('util'); /* Nodejs utilities */
    var utils = app.get('appUtils'); /* App utilities */

        // Call custom 404 error handler TODO get this to work again
    app.use(function (req, res, next) {
        res.status(404);
        res.render('./404.hjs',
            {
                title: '404',
                error: 'File Not Found: ' + req.url
            }
        );

        if (next) {
            next(req, res);
        }
    });

    // Call custom 500 error handler TODO get this to work again
    app.use(function (error, req, res, next) {
        res.status(500);
        res.render('./500.hjs',
            {
                title: '500',
                error: utils.sanitizeObject(nodeUtils.inspect(error)) + '  Url: ' + req.url
            }
        );

        if (next) {
            next(req, res);
        }
    });
};
