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
 * Wrapper for database store.
 */

"use strict";

/* db: Require MongoDB implementation */
var mongodb = require('../db/mongoDbManager.js');

/**
 * saveCatalogMetadata: Inserts or updates a catalog's metadata in the store.
 * @param session   The session
 * @param catalog   The catalog item
 * @return Returns an ack object with fields 'msg' (a human
 * readable message) and optionally 'data' (an object containing
 * information about the transaction--specifically, this is provided
 * only when the catalog item is being inserted for the first time and
 * it contains the field 'id' with the unique catalog id for the catalog item).
 */
var saveCatalogMetadata = function (session, catalog, callback) {
    return mongodb.saveCatalogMetadata(session, catalog, callback);
};
exports.saveCatalogMetadata = saveCatalogMetadata;

var saveCatalogContent = function (session, catalog, callback) {
    return mongodb.saveCatalogContent(session, catalog, callback);
};
exports.saveCatalogContent = saveCatalogContent;
