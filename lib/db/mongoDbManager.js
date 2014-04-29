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
 * Manages MongoDB database connection pool and access
 * to its databases. The API is wrapped by storeManager.js.
 */
"use strict";

var generalUtils = require('../utilities/generalUtils.js'),

// DB schema definitions, specifications, and classes
    schema = require('../model/schema.js').schema,

// The mongodb driver object
    mongodb,

// Emitter for writing content chunks (eventually, this will be in content service)
    EventEmitter = require('events').EventEmitter,

// app: The express app
    app,

// dbs: Hash of db name => db for open databases (each is a connection pool for a database)
    dbs = {},

// userCol: user profiles collection cache
    userCol,

// workCol: work content collection cache
    worksCol,

// catalogCol: catalog items collection cache
    catalogCol,

// noteCol: notes collection cache
    noteCol,

//personCol: authors, editors, and registered names collection cache
    personCol,

// Default write concern
    writeConcernAck = 1,

// Default insert/update options
    insertUpdateOptions = {w: writeConcernAck, journal: true};


//var ternTree = require('../utilities/ternTree');


/**
 * Create a db url for the specified config and db name.
 * @param config    The config object
 * @param dbName    The database name
 * @returns {string}    Returns the database URL for the specified database
 */
function makeDbUrl(config, dbName) {
    try {
        var url = 'mongodb://' + config.host + ':' + config.port + '/' + dbName + '?maxPoolSize=' + config.poolSize;
        for (var option in config.options) {
            url += '&' + option + '=' + config.options[option];
        }
        return url;
    } catch (err) {
        throw new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'DB error makeDbUrl: ' + err);
    }
};

/**
 * Configures and creates the database connection pool.
 * @param expressApp    The express app object
 * @param callback    The callback function(error, database).
 * This function is called each time a connection pool has been
 * created for a database: the result object is the database created.
 */
exports.use = function (expressApp, callback) {

    app = expressApp;
    mongodb = require('mongodb');
    var mongoClient = mongodb.MongoClient;
    var i;

    function createConnection(config, dbName, cb) {
        try {
            if (dbs[dbName]) {
                cb(null, dbs[dbName]);
            } else {
                var url = makeDbUrl(config, dbName);
                mongoClient.connect(url,
                    function (err, db) {
                        if (err) {
                            cb(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'DB error createConnection: ' + err.toString(), err));
                        } else {
                            dbs[dbName] = db;
                            if (config.verbose) {
                                console.log('Configured DB: ' + db.databaseName + ' ' + url);
                            }
                            cb(null, db);
                        }
                    });
            }
        } catch (err) {
            cb(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'DB error createConnection: ' + err.toString()), err);
        }
    }

    var dbNames = expressApp.get('config').db.dbNames,
        error = false,
        dbName;

    function setDb(err, db) {
        if (err) {
            callback(err);
            error = true;
        } else {
            dbs[dbName] = db;
        }
    }

    dbNames.forEach(function (dbName) {
        createConnection(expressApp.get('config').db, dbName, setDb);
    });

    if (!error) {
        callback();  // success
    }
};

/**
 * Returns the database object with the specified name.
 * @param dbName    The database name
 * @returns {*} A database object or undefined if there
 * is no database with the specified name.
 */
function getDB(dbName) {
    return dbs[dbName];
};

/**
 * @returns {*} Returns users collection in users DB
 */
function getUserCol() {
    if (!userCol) {
        userCol = getDB('users').collection('user');
    }
    return userCol;
}

/**
 * @returns {*} Returns works collection in works DB
 */
function getWorksCol() {
    if (!worksCol) {
        worksCol = getDB('works').collection('works');
    }
    return worksCol;
}

/**
 * @returns {*} Returns catalog collection in works DB
 */
function getCatalogCol() {
    if (!catalogCol) {
        catalogCol = getDB('works').collection('catalog');
    }
    return catalogCol;
}

/**
 * @returns {*} Returns person collection in works DB
 */
function getPersonCol() {
    if (!personCol) {
        personCol = getDB('works').collection('person');
    }
    return personCol;
}

/**
 * @returns {*} Returns notes collection in notes DB
 */
function getNoteCol() {
    if (!noteCol) {
        noteCol = getDB('notes').collection('note');
    }
}

/* START DAO READ/WRITE ********************************************************************************* */

function createCatalog(session, catalog, callback) {
    catalog._id = generalUtils.makeUUID();
    getCatalogCol().insert(catalog, insertUpdateOptions, function (err, doc) {
        if (err) {
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'Failed to create catalog item. ' + err.toString()));
        } else { // successful insert
            var catalogId = doc[0]._id.toString(),
                title = doc[0].title;
            callback(null,
                new generalUtils.DFLCondition(generalUtils.DFLCondition.ack,
                    'Created catalog item "' + (title || catalogId) + '"',
                    {created: true, data: {catalogId: catalogId}}));
        }
    });
}

function updateCatalog(session, catalog, callback) {
//    var key;
//    try {
//        key = mongodb.ObjectID.createFromHexString(catalog._id);
//    } catch (e) {
//    }
    var catalogId = catalog._id;
    delete catalog._id;
    var query = {_id: catalogId};
    getCatalogCol().update(query, {$set: catalog}, insertUpdateOptions, function (err, count) {
        if (err) {
            err.data = {catalogId: catalogId};
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans,
                'Failed to update catalog item id ' + catalogId,
                err));
        } else if (count > 0) { // successful update
            callback(null, new generalUtils.DFLCondition(generalUtils.DFLCondition.ack,
                'Updated catalog item id ' + catalogId,
                {created: false, data: {catalogId: catalogId}}));
        } else {
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans,
                'Catalog item id ' + catalogId + ' not updated because it does not exist',
                {data: {catalogId: catalogId}}));
        }
    });
}


var searchCatalog = function (query, callback) {
    doSearch(getCatalogCol(), query, 100, 'data', callback);
};


var searchPerson = function (query, callback) {
    doSearch(getPersonCol(), query, 100, 'persons', callback, {fullName: 1, description: 1});
};


/**
 * Text search for specified collection.
 * @param collection    The collection
 * @param queryString The query string
 * @param limit Maximum number of results to return (default: hard limit of 1000 results)
 * @param resultsFieldName The name of the field where the results payload (an array) will be placed
 * @param callback Callback with error arg and results arg. The result is a ready-name condition object.
 * @param fieldsToReturn An object specifying which fields should be returned (e.g., {foo: 1, bar: 1}
 * returns fields foo and bar, if they exist)
 */
var doSearch = function (collection, queryString, limit, resultsFieldName, callback, fieldsToReturn) {
    try {
        collection.find({$text: {$search: queryString}}, (fieldsToReturn || {}))
            .sort({score: -1})
            .limit(limit || 1000)
            .toArray(function (error, results) {
                if (error) {
                    callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans,
                        'Search failed: ' + error.name + ' ' + error.message,
                        error),
                        null);
                } else {
                    var r = new generalUtils.DFLCondition(generalUtils.DFLCondition.ack, results.length + ' results found');
                    r[resultsFieldName] = results
                    callback(null, r);
                }
            });
    } catch (err) {
        callback(generalUtils.makeError(err));
    }
};


/**
 * saveCatalogMetadata: Creates a new or updates an existing catalog item's metadata in the store.
 * @param session   The session
 * @param catalog   The catalog. If catalog._id exists, the catalog item
 * is updated; else it is created (inserted).
 */
var saveCatalogMetadata = function (session, catalog, callback) {
    try {
        if (catalog._id) {
            updateCatalog(session, catalog, callback);
        } else {
            createCatalog(session, catalog, callback);
        }
    } catch (err) {
        callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'Failed to save catalog metadata. ', err));
    }
};

/**
 * saveCatalogContent: Saves some content for the specified catalog. The catalog item must exist.
 * @param session   The session
 * @param catalog   The catalog item. The catalog's id field is required.
 * @param callback  The callback function(error). If no error, operation succeeded
 */
var saveCatalogContent = function (session, catalog, callback) {
    if (catalog.content) {
        if (catalog._id) {
            getWorksCol().findOne({_id: catalog._id}, function (err, doc) {
                if (err) {
                    callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Cannot find content for catalog id ' + catalog._id, err));
                } else if (doc) {
                    callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Contents already exist for catalog id ' + catalog.id));
                } else { // insert new entry (TODO queue for content service with immediate return & optional later notification)
                    parseAndWriteContent(catalog, callback);
                }
            });
        } else {
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Content missing catalog id'));
        }
    } else {
        callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Missing content'));
    }
};

function isCommand(line) {
    return (line && line.length > 0 && line.substring(0, 2) === '#!');
}
function isEnd(line) {
    return (line && line.length > 0 && line.trim() === '#!End');
}

function getCommandData(line, lineNo) {
    // e.g., #!! Note | Poem's meter
    var items = line.split('|');
    if (items.length !== 2) {
        console.info('bad command line #+' + lineNo + ': ' + line); // TODO
        console.trace();
        return;
    }
    var level = 0, lastLevel, cmdParts = items[0].split(' '), cmd = cmdParts[0].trim(), len = cmd.length;
    for (var i = 0; i < len; i += 1) {
        if (i !== 0) {
            if (cmd.charAt(i) === '!' && lastLevel === (i - 1)) {
                level += 1;
            } else {
                break;
            }
        }
        lastLevel = i;
    }
    return {dataType: cmdParts[1].trim(), title: items[1].trim(), level: level};
}

/**
 * Create a table of contents item and recursively
 * all of its sub-items (as a tree) for the specified chunk.
 * A TOC item contains the chunk's title, dataType and id.
 * The 'children' field contains any children TOC items.
 * @param chunk The chunk object
 * @param tocItem   The TOC item
 */
function makeTOCitem(chunk, tocItem) {
    if (chunk && chunk.title) {
        tocItem.title = chunk.title;
        tocItem.dataType = chunk.dataType;
        tocItem.id = chunk.id;
        if (chunk.children) {
            tocItem.children = [];
            for (var c in chunk.children) {
                var subchunk = chunk.children[c],
                    tocItemChunk = {};
                tocItem.children.push(tocItemChunk);
                makeTOCitem(subchunk, tocItemChunk);
            }
        }
    }
}

var contentWriter = new EventEmitter();

/**
 * Event handler for writing content data as a chunk.
 * @param catalog   The catalog item
 * @param chunk The chunk object
 * @param callback  A callback function(error, result)
 * When successful, the callback function doesn't return
 * any object.
 */
contentWriter.on('data', function (catalog, chunk, callback) {
    chunk.maxSid = 0; // maximum note selection id (selection ids are 1-origin; 0 means that chunk has no selectors)
    if (chunk.length !== 0) {  // write chunk as is (convenient with mongodb)
        if (chunk.data && chunk.data.length === 1 && chunk.data[0].length === 0) {
            delete chunk.data;
        }
        if (chunk.children && chunk.children.length !== 0) {
            for (var s in chunk.children) {
                var data = chunk.children[s].data;
                if (data && data.length !== 0 && data[0].length === 0) {
                    delete chunk.children[s].data;
                }
            }
        }
        getWorksCol().insert(chunk, function (error, docs) {
            if (error) {
                callback(error);
            } else {
                callback();
            }
        });
    }
});

/**
 * Parse the content of either prose or poetry.
 * @param catalog   The catalog object providing the in-memory content.
 * @param callback  The callback
 */
function parseAndWriteContent(catalog, callback) {
    var allLines = catalog.content.split('\n'),
        line, lineNo, firstChunk = true,
        chunkProcessStack = new generalUtils.Stack(), // a stack of chunks
        lastLevel = -1,
        toc = []; // table of contents

    for (lineNo in allLines) {
        line = allLines[lineNo];
        if (isEnd(line)) { // optional command
            break;
        } else if (isCommand(line)) {
            var cmdData = getCommandData(line, lineNo);
            if (cmdData.level === 1) {
                if (chunkProcessStack.size() != 0) { // save last toplevel chunk
                    writeToplevelChunk(catalog, firstChunk, false, toc, chunkProcessStack, callback);
                    firstChunk = false;
                }
                chunkProcessStack = new generalUtils.Stack({title: cmdData.title, dataType: cmdData.dataType});
            } else {
                if (cmdData.level === lastLevel) { // chunk at same level as last
                    chunkProcessStack.pop();
                } else if (cmdData.level < lastLevel) { // chunk at lower level than last
                    chunkProcessStack.pop();
                    chunkProcessStack.pop();
                } else { // chunk at higher level than last: add to
                    // do nothing
                }
                var parentChunk = chunkProcessStack.peek(); // parent
                if (!parentChunk.children) {
                    parentChunk.children = [];
                }
                var subchunkId = generalUtils.makeRandomId(schema.definitions.subchunkKeyLength);
                var newChunk = {title: cmdData.title, dataType: cmdData.dataType, id: subchunkId};
                parentChunk.children.push(newChunk);
                chunkProcessStack.push(newChunk);

                var topChunk = chunkProcessStack.bottom();
            }
            lastLevel = cmdData.level;
        } else { // chunk data
            var chunk = chunkProcessStack.peek();
            if (chunk) {
                if (!chunk.data) {
                    chunk.data = [];
                }
                chunk.data.push(line);
            }
        }
    }
    if (chunkProcessStack.size() !== 0) {
        writeToplevelChunk(catalog, firstChunk, true, toc, chunkProcessStack, callback);
    }
}

/**
 * Writes the table of contents and content starting with the toplevel chunk.
 * The TOC is saved with the first chunk. TODO make part of catalog item
 * @param catalog   The catalog item
 * @param theChunk    The chunk to write
 * @param isFirstChunk Boolean is true when the chunk is the first one
 * @param toc   The table of contents object
 * @param chunkProcessStack A stack for processing the chunks
 * @param callback  The callback function(error). If successful, no
 * error object is returned.
 */
function writeToplevelChunk(catalog, theChunk, isFirstChunk, toc, chunkProcessStack, callback) {
    var topChunk = chunkProcessStack.bottom();
    topChunk.catalogId = catalog[schema.definitions.fieldIds.id]; // TODO don't need this field if we assume a convention
    topChunk.id = theChunk ? topChunk.catalogId : generalUtils.makeUUID();
    topChunk[schema.definitions.fieldIds.id] = topChunk.id;  // TODO mongodb _id field is redundant but mandatory (too bad)
    topChunk.workTitle = catalog.title; // TODO just refer to the catalog.title
    var tocItem = {};
    makeTOCitem(topChunk, tocItem);
    toc.push(tocItem);
    contentWriter.emit('data', catalog, topChunk, function (error, result) {
        if (error) {
            var msg = 'data write error for catalog id ' + catalog.id;
            console.trace(msg);
            console.trace();
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans, msg));
        } else if (isFirstChunk) {  // write table of contents to first chunk
            var query = {};
            // The first chunk contains the table of contents and its id is identical to the catalog id
            query[schema.definitions.fieldIds.id] = catalog[schema.definitions.fieldIds.id];
            getWorksCol().update(query, {$set: {toc: toc}}, function (error, doc) {
                if (error) {
                    var msg = 'error updating TOC for catalog id ' + catalog.id;
                    console.info(msg);
                    console.trace();
                    callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans, msg));
                } else { // success
                    callback();
                }
            });
        } else {
            // nothing left to do
        }
    });
}

/**
 * Find the specified username record and, if it exists, apply
 * the given function to the username record.
 * If the record is not found, returns null.
 * @param username The username
 * @param success The function to apply to the record, if it is found. The
 * success function must accept one parameter: the user record.
 * @param error The error function to call if the record is not found. The
 * error function must accept one parameter: the error.
 * // TODO delegate to mongoDbManager.js
 */
function findUserByUsername(username, callback) {
    getUserCol().findOne({username: username}, function (err, doc) {
        if (err) {
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans, 'Failed to find user. ', err));
        } else {
            callback(null, doc);
        }
    });
}

/**
 * Saves a new user record.
 * @param userRec   The user record
 * @param callback  The callback function(error, result)
 * The result object is an array containing the saved user object.
 */
function singupUser(userRec, callback) {
    if (userRec) {
        getUserCol().insert(userRec, function (err, docs) {
            if (err) {
                callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.trans, 'Failed to sign up user. ', err));
            } else {
                callback(null, docs);
            }
        });
    } else {
        callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'missing user record'));
    }
}

/**
 * Retrieve a chunk.
 * @param chunkId   The chunk id
 * @param callback  The callback function(error, result).
 * The result is the chunk object.
 */
var getChunk = function (chunkId, callback) {
    if (chunkId) {
        getWorksCol().findOne({_id: chunkId}, function (err, chunk) {
            if (err) {
                callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.error, 'Content for work chunk id ' + chunkId + ' not found', err));
            } else {
                callback(null, new generalUtils.DFLCondition(generalUtils.DFLCondition.ack, null, {chunk: chunk}));
            }
        });
    } else {
        callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'missing chunk id param'));
    }
};

/**
 * Try to find the chunk with the specified chunk id and whose max selection id
 * is consistent with the note's selection id (it should be greater than the
 * saved chunk's max selection id). If not found,
 * then presume it has been modified and return error to client
 * (who will retrieve the latest version and try the operation again).
 * If it is found, save the note and update the chunk contents
 * with the markup for the note's selection(s).
 *
 * Note identifier: this simple note spans only a chunk. Hence, the
 * note's id is composed:
 *    <chunk id>_<selection id>
 *
 * @param note  The note
 * @param callback
 */
var addNote = function (note, callback) {
    if (note) {
        try {
            var update = {
                $set: {data: note.contentArray},
                $inc: {maxSid: 1}
            };
            // Add note indexed by sid
            // TODO support chaining of subchunks into a virtual chunk of specified maximum size
            //      ideally, a background process would break up chunks when they get too large, but for that we need to
            //      disassociate chunks from sections (e.g., poems) indexed by the TOC. We'd need each toc entry
            //      to reference a list of chunks instead of a single one.
            update.$set['notes.' + note.sid] = {
                type: note.type,
                text: note.text,
                hiliteColor: note.hiliteColor || '#ffff00',
                tooltipMethod: note.tooltipMethod,
                tooltipPlacement: note.tooltipPlacement
            };

            getWorksCol().findAndModify(

                // Modify it only if the max sid is consistent with the new one
                {
                    _id: note.chunkId,
                    maxSid: (parseInt(note.sid, 10) - 1)
                },

                // Sort (irrelevant since we'll match at most one record)
                [],

                // Update the chunk content array and increment the max sidupdate,
                update,

                // Options: Return old doc (really no need for doc other than to know whether update occurred)
                {},

                function (err, chunk) {
                    if (err) {
                        callback(generalUtils.makeError(err, 'Database error'));
                    } else {
                        callback(null, new generalUtils.DFLCondition(generalUtils.DFLCondition.ack, null, {updated: chunk ? true : false}));
                    }
                }
            );
        } catch (err) {
            callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'Failed to add note.', err));
        }
    } else {
        callback(new generalUtils.DFLCondition(generalUtils.DFLCondition.fatal, 'missing note param'));
    }
};

exports.makeDbUrl = makeDbUrl;
exports.addNote = addNote;
exports.getChunk = getChunk;
exports.searchCatalog = searchCatalog;
exports.searchPerson = searchPerson;
exports.saveCatalogContent = saveCatalogContent;
exports.saveCatalogMetadata = saveCatalogMetadata;
exports.findUserByUsername = findUserByUsername;
exports.singupUser = singupUser;

/* END DAO READ/WRITE ********************************************************************************* */
