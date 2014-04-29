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
 * @param callback  The callback function(error, result)
 * Successful callback provides an ack object with fields 'msg' (a human
 * readable message) and optionally 'data' (an object containing
 * information about the transaction--specifically, this is provided
 * only when the catalog item is being inserted for the first time and
 * it contains the field 'id' with the unique catalog id for the catalog item).
 */
var saveCatalogMetadata = function (session, catalog, callback) {
    mongodb.saveCatalogMetadata(session, catalog, callback);
};

/**
 * Saves catalog content.
 * @param session   The session
 * @param catalog   The catalog item
 * @param callback  The callback function(error). If successful,
 * the callback is called without any parameters.
 */
var saveCatalogContent = function (session, catalog, callback) {
    mongodb.saveCatalogContent(session, catalog, callback);
};

/**
 * Retrieves a content chunk
 * @param chunkId   The chunk's identifier
 * @param callback  The callback function(error, result)
 * A successful callback's result is an ack object with
 * a field named 'chunk' that contains the chunk object.
 */
var getChunk = function (chunkId, callback) {
    mongodb.getChunk(chunkId, callback);
};

/**
 * Adds a note to some content.
 * @param note  The note specification object
 * @param callback  The callback function(error, result).
 * If successful, the result object will contain a field
 * names 'update' set to true if the note was updated or
 * false if it was not.
 */
var addNote = function (note, callback) {
    mongodb.addNote(note, callback);
};

exports.makeDbUrl = mongodb.makeDbUrl;
exports.getChunk = getChunk;
exports.addNote = addNote;
exports.saveCatalogMetadata = saveCatalogMetadata;
exports.saveCatalogContent = saveCatalogContent;
