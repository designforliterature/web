/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2014 Ruben Kleiman
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

// SERVER SIDE --------------------------------------------------------------------------------------------

'use strict';

var express = require('express');

var appUtils = require('../utilities/generalUtils.js');

/* Require MongoDB implementation */
var store = require('../store/storeManager.js');

/* Require local search implementation */
var search = require('../search/searchManager.js');

/**
 * The public API for the catalog service.
 */
var catalogService = {

    saveMetadata: function (session, catalog, callback) {
        try {
            store.saveCatalogMetadata(session, catalog, callback);
        } catch (error) {
            callback(appUtils.makeError(error));
        }
    },

    /* search: searches catalog per query */
    search: function (query, callback) {
        try {
            search.searchCatalog(query, callback);
        } catch (error) {
            callback(appUtils.makeError(error));
        }
    },

    /**
     * saveContent: Saves an existing catalog item's contents.
     * Currently supports only dflMarkup content.
     *
     * Sends notifications, as requested or necessary, for warnings/errors and successful completion.
     */
    saveContent: function (session, catalog, callback) {

        // TODO push it into Queue Service to be handled by content service

        if (catalog.content && catalog.content.length > 0) {
            store.saveCatalogContent(session, catalog, callback); // we are accepting dflMarkup data only for now
//            if (catalog.workType) {
//                var workTypeMethods = workType.methods[catalog.workType];
//                if (workTypeMethods) {
//                    var formatName = catalog.contentFormat;
//                    if (formatName) {
//                        var format = workTypeMethods[formatName];
//                        if (format) {
//                            var saveContentMethod = format.canonicalize;
//                            if (saveContentMethod && (typeof saveContentMethod === 'function')) {
//                                saveContentMethod(catalog);
//                            } else {
//                                callback({type: 'fatal', msg: 'No method for canonicalizing work. contentFormat "' + formatName + '" workType "' + catalog.workType + '" item id ' + catalog.id + ' title: "' + catalog.title + '"'});
//                            }
//                        } else {
//                            callback({type: 'fatal', msg: 'No support for work contentFormat "' + formatName + '" workType "' + catalog.workType + '" item id ' + catalog.id + ' title: "' + catalog.title + '"'});
//                        }
//                    } else {
//                        callback({type: 'fatal', msg: 'No support for work contentFormat "' + formatName + '" workType "' + catalog.workType + '" item id ' + catalog.id + ' title: "' + catalog.title + '"'});
//                    }
//                } else {
//                    callback({type: 'fatal', msg: 'No workType "' + catalog.workType + '" for item id ' + catalog.id + ' title: "' + catalog.title + '"'});
//                }
//            } else {
//                callback({type: 'fatal', msg: 'Work workType is missing for item id ' + catalog.id + ' title: ' + catalog.title});
//            }
        } else {
            express.get('sockets').getSocket(session, express.get('notificationSocketName')).emit('note', {type: 'warn', msg: 'Catalog item had no content'});
            console.warn({type: 'trans', msg: 'Missing content'});
        }
    }
};

exports.catalogService = catalogService;
