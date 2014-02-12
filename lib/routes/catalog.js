/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2013 Ruben Kleiman
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *and associated documentation files (the "Software"), to deal in the Software without restriction,
 *including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 *subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all copies or
 *substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 *THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';

// SERVER SIDE --------------------------------------------------------------------------------------------

/* Object schemas and definitions */
var schemas = require('../../public/scripts/app/schema.js');

/* The catalog service */
var catalogService = require('../services/catalogService.js').catalogService;

/* App utilities */
var  appUtils = require('../utilities/generalUtils.js');

/* File system to read uploaded file from tmp location */
var fs = require('fs');


/**
 * Safely copies request body parameters into corresponding
 * catalog properties. All text is sanitized and only properties
 * that are defined in the schema of the catalog object are copied into the catalog.
 * @param req   The http request
 */
function makeCatalogItemFromRequest(req) {
    var prop, catalog = new schemas.schema.Catalog();
    for (prop in req.body) {
        // SECURITY POINT: make sure that the property exists in the catalog!
        if (req.body.hasOwnProperty(prop) && catalog.hasOwnProperty(prop)) {
            var item = req.body[prop];
            catalog[prop] = appUtils.sanitizeObject(item);
        }
    }
    return catalog;
}

module.exports = function (app) {

    // TODO Replace file upload with https://github.com/andrewrk/node-multiparty/ for connect-3.0 ???
    app.namespace('/catalog', function processSubmit() {

        // TODO
        app.post('/search/query', function (req, res, next) {
            var query = req.body.general;
            var notify = true; // req.body.notify;
            try {
                catalogService.search(req.session, query, function (error, result) {
                    if (error) {
                        result = error;
                    }
                    res.json(result);
                });
            } catch (err) {
                var error = appUtils.makeError(err);
                if (notify) {
                    var noteSocket = sockets.getSocket(req.session, app.get('notificationSocketName'));
                    if (noteSocket) {
                        noteSocket.emit('note', error);
                    }
                }
            }
            if (next) {
                next(req, res);
            }
        });

        app.post('/submit/metadata', function (req, res, next) {

            var sockets = app.get('sockets'); // TODO fetch might be done just once at init time if ordering is correct
            var txId = appUtils.makeId(appUtils.txIdLength);
            var notify = req.body.notify;
            var txSocket, noteSocket;

            try {
                res.json({type: 'ack', txId: txId}); // send response immediately (errors reported later through tx socket)

                var catalog = makeCatalogItemFromRequest(req);
                noteSocket = notify ? sockets.getSocket(req.session, app.get('notificationSocketName')) : null; // client requested notifications for this transaction
                txSocket = sockets.getSocket(req.session, app.get('txSocketName'));
                catalogService.saveMetadata(req.session, catalog, function (error, result) {
                    if (error) {
                        result = error;
                    }
                    result.txId = txId;
                    txSocket.emit('catalog/submit/metadata', result);
                    if (noteSocket) {
                        noteSocket.emit('note', result);
                    }
                });
            } catch (err) {
                var error = appUtils.makeError(err);
                txSocket = sockets.getSocket(req.session, app.get('txSocketName'));
                if (txSocket) {
                    txSocket.emit('catalog/submit/metadata', error);
                }
                if (notify) {
                    noteSocket = sockets.getSocket(req.session, app.get('notificationSocketName'));
                    if (noteSocket) {
                        noteSocket.emit('note', error);
                    }
                }
            }

            if (next) {
                next(req, res);
            }
        });

        // TODO
        app.post('/submit/content', function (req, res, next) {

            res.json({ok: true}); // send response immediately (errors reported later through tx socket)

            var txId = req.body.txId;

            var catalog = new schemas.schema.Catalog();

            var prop;
            for (prop in req.body) {
                // SECURITY POINT: make sure that the property exists in the catalog!
                if (req.body.hasOwnProperty(prop) && catalog.hasOwnProperty(prop)) {
                    var item = req.body[prop];
                    catalog[prop] = appUtils.sanitizeObject(item);
                }
            }
            var filepath = req.files.work.path;
            fs.readFile(filepath, {encoding: "UTF-8"}, function (err, content) {
                fs.unlink(filepath, function (err) { /* remove file from tmp location */
                    if (err) {
                        console.warn('Failed to unlink tmp file ' + err);
                    }
                });
                catalog.content = content;
                try {
                    var result = catalogService.saveContent(req.session, catalog, x);
                    if (result === 'updated') {
                        noteSocket.emit('note', {type: 'note', msg: 'Catalog item updated'});
                        txSocket.emit('submit', {type: 'ack', msg: 'Catalog item id ' + catalog.id + ' updated'});
                    } else { // result is insert catalog id
                        noteSocket.emit('note', {type: 'note', msg: 'Catalog item inserted'});
                        txSocket.emit('submit', {type: 'ack', msg: 'New catalog item inserted with id ' + result, data: {id: result}});
                    }
                } catch (e) {
                    var error = appUtils.makeError(e);
                    app.get('sockets').getSocket(req.session, app.get('notificationSocketName')).emit('note', error);
                }
            });
//                res.redirect("back"); /* go back one page after the upload */
        });

    });
};
