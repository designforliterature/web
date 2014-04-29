/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

'use strict';

// SERVER SIDE --------------------------------------------------------------------------------------------

/* Object schemas */
var schema = require('../model/schema.js').schema;

/* The catalog service */
var catalogService = require('../services/catalogService.js').catalogService;

/* The work service */
var workService = require('../services/workService.js').workService;

/* The person service */
var personService = require('../services/personService.js').personService;

/* App utilities */
var generalUtils = require('../utilities/generalUtils.js');

/* File system to read uploaded file from tmp location */
var fs = require('fs');

/* db: Require MongoDB implementation */
var mongodb = require('../db/mongoDbManager.js');


/**
 * Safely copies request body parameters into a
 * canonical catalog object. All text is sanitized and only properties
 * that are defined in the schema of the catalog object are copied into the catalog.
 * @param request   The http request
 * @param txId  The transaction id
 * @return {object} Returns the server catalog
 */
function makeCanonicalCatalog(metadata, txId) {
    var workType = metadata.workType;
    if (typeof workType === 'undefined') {
        throw new generalUtils.DFLCondition('fatal', 'Work type is required', {txId: txId});
    }
    var fieldId, catalog = schema.makeClientCatalog(workType);
    // Compose sanitized & normalized client catalog object
    for (fieldId in metadata) {
        // SECURITY POINT: make sure that the property exists in the catalog!
        if (metadata.hasOwnProperty(fieldId) && catalog.hasOwnProperty(fieldId)) {
            var item = metadata[fieldId];
            catalog[fieldId] = generalUtils.sanitizeObject(item);
        }
    }

    // Create canonical catalog object from it and validate fields
    for (fieldId in catalog) {
        var fieldSpec = schema.getFieldSpec(workType, fieldId);
        if (typeof fieldSpec === 'undefined') {
            throw new generalUtils.DFLCondition('fatal', 'No field spec "' + fieldId + '"');
        }
        if (fieldSpec.required) {
            var val = catalog[fieldId];
            if (typeof val === 'undefined' || val.length === 0) {
                throw new generalUtils.DFLCondition('error', 'Catalog field "' + fieldSpec.name + '" is required', {txId: txId});
            }
        }
        var validator = schema.validators[fieldSpec.validator];
        if (typeof validator === 'undefined') {
            throw new generalUtils.DFLCondition('fatal', 'No validator for catalog field ' + fieldSpec.name, {txId: txId});
        }
        validator(catalog, fieldSpec, txId);
    }

    // Create canonical catalog and copy transformed client data onto it
    var canonicalCatalog = {};
    for (fieldId in catalog) {
        if (typeof catalog[fieldId] !== 'undefined') {
            var fieldSpec = schema.getFieldSpec(workType, fieldId); // known to exist
            var xformer = schema.transformers[fieldSpec.xformer];
            if (typeof xformer === 'undefined') {
                throw new generalUtils.DFLCondition('fatal', 'No transformer for catalog field ' + fieldSpec.name, {txId: txId});
            }
            xformer(fieldSpec, catalog, canonicalCatalog);
        }
    }
    return canonicalCatalog;
}

module.exports = function (app) {

    app.namespace('/note', function () {

        /**
         * Adds a note for the chunk
         */
        app.post('/', function (req, res, next) {
            if (req.body.note) {
                workService.addNote(req.body.note, function (err, success) {
                    res.json(err || success);
                });
            } else {
                res.json(new generalUtils.DFLCondition('fatal', 'missing note param'))
            }
        });




        /**
         * Search for a note type by name query
         * @return {*} Returns object with field named `types` that contains
         * an array of note type objects. A note type object consists of the
         * following fields:
         * name: the display name of the type
         * code: the type code
         * descr: an optional description of the type
         */
        app.get('type/json', function (req, res, next) {
            var query = req.query
            if (!query) {
                res.json(new generalUtils.DFLCondition('fatal', 'No note type query found'));
            } else {
                workService.searchNoteType(query, function (error, result) {
                    if (error) {
                        result = error;
                    }
                    res.json(result);
                });
            }
        });

    });

    // TODO Replace file upload with https://github.com/andrewrk/node-multiparty/ for connect-3.0 ???
    app.namespace('/catalog', function () {

        /**
         * Returns work chunk data, including contents.
         */
        app.get('work/chunk', function (req, res, next) {
            if (req.query.id) {
                workService.getChunk(req.query.id, function (err, chunk) {
                    res.json(err || chunk);
                });
            } else {
                res.json(new generalUtils.DFLCondition('fatal', 'missing chunk id param'));
            }
        });

        /**
         * Search for a person by name query
         * @return {*} Returns object with field named persons that contains
         * an array of person objects. A person object consists of the
         * following fields:
         * _id: the UUID
         * fullName: the full name of the person
         * description: a possible description of the person
         */
        app.get('persons/json', function (req, res, next) {
            var query = req.query
            if (!query) {
                res.json(new generalUtils.DFLCondition('fatal', 'Missing query param'));
            } else if (!query.name) {
                res.json(new generalUtils.DFLCondition('ack', 'No results', {persons: []}));
            } else {
                personService.search(query, function (error, result) {
                    res.json(error || result);
                });
            }
        });

        /*
         TODO run scripts/init-db.js when initing the DB
         */
        app.post('/search/query', function (req, res, next) {

            var query = req.body.general;
            var sockets = app.get('sockets'); // TODO fetch might be done just once at init time if ordering is correct
            var notify = req.body.notify;
            var noteSocket;
            if (notify) {
                noteSocket = sockets.getSocket(req.session, app.get('notificationSocketName'));
            }

            try {
                if (!query) {
                    res.json(new generalUtils.DFLCondition('ack', 'No results found.'));
                } else {
                    catalogService.search(query, function (error, result) {
                        if (error) {
                            result = error;
                        }
                        if (noteSocket) {
                            noteSocket.emit('note', result);
                        }
                        res.json(result);
                    });
                }
            } catch (err) {
                var error = generalUtils.makeError(err);
                res.json(error);
                if (noteSocket) {
                    noteSocket.emit('note', error);
                }
            }
//            if (next) {
//                next(req, res);
//            }
        });


        app.post('/submit', function (req, res) {

            if (!req.session || !req.session.username) {
                res.json(new generalUtils.DFLCondition('error', 'User not signed in'));
            } else {
                var sockets = app.get('sockets'); // TODO fetch might be done just once at init time if ordering is correct
                var txId = generalUtils.makeRandomId(generalUtils.txIdLength);
                var notify = req.body.notify;
                var txSocket, noteSocket;
                var metadata = (typeof req.body.metadata === 'string') ? JSON.parse(req.body.metadata) : req.body.metadata;
                var haveContent = (typeof req.files !== 'undefined');

                try {
                    // Step 1: save catalog metadata
                    var catalog = makeCanonicalCatalog(metadata, txId);
                    noteSocket = notify ? sockets.getSocket(req.session, app.get('notificationSocketName')) : null; // client requested notifications for this transaction
                    txSocket = sockets.getSocket(req.session, app.get('txSocketName'));
                    catalogService.saveMetadata(req.session, catalog, function (error, saveMetadataResult) {
                        if (error) {
                            error.txId = txId;
                            txSocket.emit('catalog/submit', error);
                            !noteSocket || noteSocket.emit('note', error);
                        } else {
                            saveMetadataResult.txId = txId;
                            var catalogId = saveMetadataResult.data.catalogId;
                            if (!catalogId) {
                                var err = new generalUtils.DFLCondition('fatal', 'Catalog id not returned', {txId: txId});
                                txSocket.emit('catalog/submit', err);
                                !noteSocket || noteSocket.emit('note', err);
                            } else {
                                // Step 2: optionally save content file
                                if (haveContent) {
                                    var filepath = req.files.file.path;
                                    // TODO reads whole file's content: should really pass a stream object to be consumed by the work type parser!
                                    fs.readFile(filepath, {encoding: "UTF-8"}, function (err, content) {
                                        fs.unlink(filepath, function (err) { /* remove file from tmp location */
                                            if (err) {
                                                console.warn('Failed to unlink tmp file ' + err);
                                            }
                                        });
                                        try {
                                            catalog._id = catalogId;
                                            catalog.content = content;
                                            catalogService.saveContent(req.session, catalog, function (error, saveContentResult) {
                                                var result = error || saveContentResult;
                                                result.txId = txId;
                                                txSocket.emit('catalog/submit', result);
                                                !noteSocket || noteSocket.emit('note', result);
                                            });
                                        } catch (e) {
                                            e = generalUtils.makeError(e);
                                            txSocket.emit('catalog/submit', e);
                                            !noteSocket || noteSocket.emit('note', e);
                                        }
                                    });
                                } else {
                                    txSocket.emit('catalog/submit', saveMetadataResult);
                                    !noteSocket || noteSocket.emit('note', saveMetadataResult);
                                }
                            }
                        }
                    });

                    res.json(new generalUtils.DFLCondition('ack', null, {txId: txId})); // send response immediately (errors reported later through tx socket)

                } catch (err) {
                    var error = generalUtils.makeError(err);
                    try { // try to directly get sockets as that might have been the problem
                        txSocket = sockets.getSocket(req.session, app.get('txSocketName'));
                        if (txSocket) {
                            txSocket.emit('catalog/submit', error);
                        }
                        if (notify) {
                            noteSocket = sockets.getSocket(req.session, app.get('notificationSocketName'));
                            if (noteSocket) {
                                noteSocket.emit('note', error);
                            }
                        }
                        res.json(error);
                    } catch (err2) { // last ditch
                        throw error;
                    }
                }
            }
        });
    });
};

