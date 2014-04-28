/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// SERVER SIDE --------------------------------------------------------------------------------------------

'use strict';

var express = require('express');

var generalUtils = require('../utilities/generalUtils.js');

/* Require MongoDB implementation */
var store = require('../store/storeManager.js');

/* Require local search implementation */
var search = require('../search/searchManager.js');

/**
 * The public API for the catalog service.
 */
var catalogService = {

    saveMetadata: function (session, catalog, callback) {
        store.saveCatalogMetadata(session, catalog, callback);
    },

    /* search: searches catalog per query */
    search: function (query, callback) {
        search.searchCatalog(query, callback);
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
        } else {
            express.get('sockets').getSocket(session, express.get('notificationSocketName')).emit('note',
                new generalUtils.DFLCondition('warn', 'Catalog item had no content'));
            console.warn(new generalUtils.DFLCondition('trans', 'Missing content'));
        }
    }
};

exports.catalogService = catalogService;
