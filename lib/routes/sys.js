/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

'use strict';

// SERVER-SIDE ---------------------------------------------------------------------------------------------------

var generalUtils = require('../utilities/generalUtils.js');

/**
 *
 * @param app
 */
module.exports = function (app) {

    app.namespace('/sys', function () {

        app.get('/status', function (req, res, next) {
            global.gc();
            var mem = process.memoryUsage();
            var x = mem.heapUsed / mem.heapTotal;
            var pct = parseInt(100 * x, 10);
            res.json(new generalUtils.DFLCondition('ack',
                ' Heap Used: ' + pct + '% \nHeap (used/total kbytes): ' + parseInt(mem.heapUsed / 1000, 10) + '/' + parseInt(mem.heapTotal / 1000, 10) + '\n Stack (kbytes): ' + parseInt(mem.rss / 1000, 10)));
        });
    });

};