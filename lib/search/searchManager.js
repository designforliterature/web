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
 * Wrapper for search.
 * TODO this will be a separate search service.
 */

"use strict";

/**
 *  mongodb: Require MongoDB implementation. We use MongoDB's text search
 *  engine until we can implement a separate service for this.
 */
var mongodb = require('../db/mongoDbManager.js');

var searchCatalog = function (query, callback) {
    return mongodb.searchCatalog(query, callback);
};

/**
 * Performs either ngram or tokenized index search
 * @param query The query object with the following fields:
 * name (required) := the search string
 * ngram (optional) := if set to true, then an ngram search is requested
 * @param callback
 * @returns {*}
 */
var searchPerson = function (query, callback) {
    return mongodb.searchPerson(query, callback);
};

exports.searchPerson = searchPerson;
exports.searchCatalog = searchCatalog;