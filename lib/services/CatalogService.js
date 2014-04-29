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

var express = require('express'),

    generalUtils = require('../utilities/generalUtils.js'),

// Require MongoDB implementation
    store = require('../store/storeManager.js'),

// Require local search implementation
    search = require('../search/searchManager.js');

/**
 * The public API for the catalog service.
 */
exports.catalogService = {

    /**
     * Saves the specified metadata.
     * @param session   The session object
     * @param catalog   The catalog item object
     * @param callback  The callback function(error, result)
     * Successful callback provides an ack object with fields 'msg' (a human
     * readable message) and optionally 'data' (an object containing
     * information about the transaction--specifically, this is provided
     * only when the catalog item is being inserted for the first time and
     * it contains the field 'id' with the unique catalog id for the catalog item).
     */
    saveMetadata: function (session, catalog, callback) {
        store.saveCatalogMetadata(session, catalog, callback);
    },

    /**
     * Searches the catalog per specified query
     * @param query The query (a string)
     * @param callback  The callback function(error, result).
     */
    search: function (query, callback) {
        search.searchCatalog(query, callback);
    },

    /**
     * saveContent: Saves an existing catalog item's contents.
     * Currently supports only dflMarkup content.
     *
     * Sends notifications, as requested or necessary, for warnings/errors and successful completion.
     * @param session   The session object
     * @param catalog   The catalog item object
     * @param callback  The callback function(error, result)
     */
    saveContent: function (session, catalog, callback) {

        // TODO push it into Queue Service to be handled by content service

        if (catalog.content && catalog.content.length > 0) {
            store.saveCatalogContent(session, catalog, callback); // we are accepting dflMarkup data only for now
        } else {
            var condition = new generalUtils.DFLCondition(generalUtils.DFLCondition.trans,
                'No content in catalog id ' + catalog.id);
            try {
                express.get('sockets').getSocket(session, express.get('notificationSocketName')).emit('note', condition);
                console.warn(condition);
            } catch (err) {
                // do nothing
            }
            callback(condition);
        }
    }
};
