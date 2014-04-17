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
 * to its databases.
 */
"use strict";

var generalUtils = require('../utilities/generalUtils.js'),
    schema = require('../model/schema.js').schema,
    EventEmitter = require('events').EventEmitter,
    uuid = require('../utilities/uuid.js');

//var ternTree = require('../utilities/ternTree');

// TODO close connections when server goes down if the driver doesn't do it

/* app: The express app */
var app;

/* dbs: Hash of db name => db for open databases (each is a connection pool for a database) */
var dbs = {};

/** mongodb: The mongodb object */
var mongodb;

/*
 * Collection caches:
 * userCol: user profiles
 * workCol: works' content
 * catalogCol: catalog items
 * noteCol: notes
 * personCol: authors, editors, and registered names
 */
var userCol, worksCol, catalogCol, personCol, noteCol;

var writeConcernAck = 1;
var insertUpdateOptions = {w: writeConcernAck, journal: true};


// Create a db url for the specified config and db name
exports.makeDbUrl = function makeDbUrl(config, dbName) {
    try {
        var url = 'mongodb://' + config.host + ':' + config.port + '/' + dbName + '?maxPoolSize=' + config.poolSize;
        for (var option in config.options) {
            url += '&' + option + '=' + config.options[option];
        }
        return url;
    } catch (err) {
        throw {type: 'fatal', msg: 'DB error makeDbUrl: ' + err};
    }
};

// Configures and creates database connection pools
exports.use = function (expressApp, cb) {

    app = expressApp;
    mongodb = require('mongodb');
    var mongoClient = mongodb.MongoClient;
    var i;

    function createConnection(config, dbName, cb) {
        try {
            if (dbs[dbName]) {
                cb(null, dbs[dbName]);
            } else {
                //placeholder: modify this-should come from a configuration source
                var url = exports.makeDbUrl(config, dbName);
                mongoClient.connect(url,
                    function (err, db) {
                        if (err) {
                            err = "createConnection failed: " + err;
                        } else {
                            dbs[dbName] = db;
                            if (config.verbose) {
                                console.log('Configured DB: ' + db.databaseName + ' ' + url);
                            }
                        }
                        cb(err, db);
                    });
            }
        } catch (err) {
            throw {type: 'fatal', msg: 'DB error createConnection: ' + err};
        }
    }

    var dbNames = expressApp.get('config').db.dbNames;
    var dbName;

    function setDb(err, db) {
        if (err) {
            if (cb) {
                cb(err);
            } else {
                console.log('setDb: ' + err);
            }
        } else {
            dbs[dbName] = db;
        }
    }

    dbNames.forEach(function (dbName) {
        createConnection(expressApp.get('config').db, dbName, setDb);
    });
    if (cb) {
        cb();
    }
    try {
    } catch (err) {
        throw {type: 'fatal', msg: err};
    }
};

var getDB = function (dbName) {
    return dbs[dbName];
};
// Returns the database with the specified name or undefined if it doesn't exist.
exports.getDB = getDB;

var getMongoDb = function () {
    return mongodb;
};
exports.getMongoDb = getMongoDb;

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
 * @returns {*} Returns person collection
 */
function getPersonCol() {
    if (!personCol) {
        personCol = getDB('works').collection('person');
    }
    return personCol;
}

function getNoteCol() {
    if (!noteCol) {
        noteCol = getDB('notes').collection('note');
    }
}

/* START DAO READ/WRITE ********************************************************************************* */

function createCatalog(session, catalog, callback) {
    catalog._id = uuid.v4(); // create v4 uuid as catalog item key
    getCatalogCol().insert(catalog, insertUpdateOptions, function (err, doc) {
        if (err) {
            callback(generalUtils.makeError({type: 'fatal', msg: 'Failed to create catalog item. '}, err));
        } else { // successful insert
            var catalogId = doc[0]._id.toString(),
                title = doc[0].title;
            callback(null, {type: 'ack', msg: 'Created catalog item "' + (title || catalogId) + '"', created: true, data: {catalogId: catalogId}});
        }
    });
}

function updateCatalog(session, catalog, callback) {
//    var key;
//    try {
//        key = mongodb.ObjectID.createFromHexString(catalog._id);
//    } catch (e) {
//        callback({type: 'error', msg: 'Catalog item id "' + catalog._id + '" is invalid'});
//    }
    var catalogId = catalog._id;
    delete catalog._id;
    var query = {_id: catalogId};
    getCatalogCol().update(query, {$set: catalog}, insertUpdateOptions, function (err, count) {
        if (err) {
            callback(generalUtils.makeError({type: 'trans', msg: 'Failed to update catalog item id ' + catalogId, data: {catalogId: catalogId}}, err));
        } else if (count > 0) { // successful update
            callback(null, {type: 'ack', msg: 'Updated catalog item id ' + catalogId, created: false, data: {catalogId: catalogId}});
        } else {
            callback({type: 'trans', msg: 'Catalog item id ' + catalogId + ' not updated because it does not exist', data: {catalogId: catalogId}});
        }
    });
}


var searchCatalog = function (query, callback) {
    doSearch(getCatalogCol(), query, 100, 'data', callback);
};


var searchPerson = function (query, callback) {
    doSearch(getPersonCol(), query.name, 100, 'persons', callback, {fullName: 1, description: 1});
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
    var cursor = collection.find({$text: {$search: queryString}}, fieldsToReturn).sort({score: -1});
    cursor.limit(limit || 1000);
    cursor.toArray(function (error, results) {
        if (error) {
            error = generalUtils.makeError({type: 'trans', msg: 'Search failed'}, ': ' + error.name + ' ' + error.message);
            callback(error, null);
        } else {
            var r = {type: 'ack', msg: results.length + ' results found'};
            r[resultsFieldName] = results
            callback(null, r);
        }
    });
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
        callback(generalUtils.makeError({type: 'fatal', msg: 'Failed to save catalog metadata. '}, err));
    }
};

/**
 * saveCatalogContent: Saves some content for the specified catalog. The catalog item must exist.
 * @param session   The session
 * @param catalog   The catalog item. The catalog's id field is required.
 * @param callback  The callback for results or errors
 */
var saveCatalogContent = function (session, catalog, callback) {
    if (catalog.content) {
        if (catalog._id) {
            getWorksCol().findOne({_id: catalog._id}, function (err, doc) {
                if (err) {
                    callback(generalUtils.makeError({type: 'error', msg: 'Cannot find content for catalog id ' + catalog._id}, err));
                } else if (doc) { // delete or mark for deletion
                    // TODO
                } else { // insert new entry
                    parseAndWriteContent(catalog, callback);
                }
            });
        } else {
            callback({type: 'error', msg: 'Content missing catalog id'});
        }
    } else {
        callback({type: 'error', msg: 'Missing content'});
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
        console.trace('bad command line #+' + lineNo + ': ' + line); // TODO
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

function parseAndWriteContent(catalog, callback) {
    var allLines = catalog.content.split('\n'),
        line, lineNo, firstChunk = true,
        chunkProcessStack = new generalUtils.Stack(), // a stack of chunks
        lastLevel = -1,
        toc = [], // table of contents
        inPoem = false; // inside a poem; else inside prose

    for (lineNo in allLines) {
        line = allLines[lineNo];
        if (isEnd(line)) { // optional command
            break;
        } else if (isCommand(line)) {
            var cmdData = getCommandData(line, lineNo);
            if (cmdData.level === 1) {
                if (chunkProcessStack.size() != 0) { // save last toplevel chunk
                    writeToplevelChunk(catalog, firstChunk, false, toc, chunkProcessStack);
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
                var subchunkId = generalUtils.makeId(schema.definitions.subchunkKeyLength);
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
        writeToplevelChunk(catalog, firstChunk, true, toc, chunkProcessStack);
    }
}

function writeToplevelChunk(catalog, firstChunk, lastChunk, toc, chunkProcessStack) {
    var topChunk = chunkProcessStack.bottom();
    topChunk.catalogId = catalog[schema.definitions.fieldIds.id]; // TODO don't need this field if we assume a convention
    topChunk.id = firstChunk ? topChunk.catalogId : uuid.v4();
    topChunk[schema.definitions.fieldIds.id] = topChunk.id;  // TODO redundancy simply due to uniform labeling... but hm..
    topChunk.workTitle = catalog.title; // TODO redundant data must be updated whenever the catalog is updated
    var tocItem = {};
    makeTOCitem(topChunk, tocItem);
    toc.push(tocItem);
    contentWriter.emit('data', catalog, topChunk, function (error, result) {
        if (error) {
            console.trace('data error'); // TODO
        } else if (lastChunk) {  // write table of contents to first chunk
            var query = {};
            // The first chunk contains the table of contents and its id is identical to the catalog id
            query[schema.definitions.fieldIds.id] = catalog[schema.definitions.fieldIds.id];
            getWorksCol().update(query, {$set: {toc: toc}}, function (error, doc) {
                if (error) {
                    console.trace('error updating');
                } else {
                    // TODO
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
            callback(generalUtils.makeError({type: 'trans', msg: 'Failed to find user. '}, err));
        } else {
            callback(null, doc);
        }
    });
}

/**
 * Saves a user record.
 * @param userRec   The user record
 * @param callback  The callback
 */
function singupUser(userRec, callback) {
    if (userRec) {
        getUserCol().insert(userRec, function (err, docs) {
            if (err) {
                callback(generalUtils.makeError({type: 'trans', msg: 'Failed to sign up user. '}, err));
            } else {
                callback(null, docs);
            }
        });
    } else {
        callback({type: 'fatal', msg: 'missing user record'});
    }
}

var getChunk = function (chunkId, callback) {
    if (chunkId) {
        getWorksCol().findOne({_id: chunkId}, function (err, chunk) {
            if (err) {
                callback({type: 'error', msg: 'Content for work chunk id ' + chunkId + ' not found'});
            } else {
                callback({type: 'ack', chunk: chunk});
            }
        });
    } else {
        callback({type: 'fatal', msg: 'missing chunk id'});
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
            // TODO problem is that a chunk document could get very large, but it's convenient for now.
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
                        callback(null, {type: 'ack', updated: chunk ? true : false});
                    }
                }
            );
        } catch (err) {
            callback({type: 'fatal', msg: generalUtils.makeError(err)});
        }
    } else {
        callback({type: 'fatal', msg: 'missing note'});
    }
};

exports.addNote = addNote;
exports.getChunk = getChunk;
exports.searchCatalog = searchCatalog;
exports.searchPerson = searchPerson;
exports.saveCatalogContent = saveCatalogContent;
exports.saveCatalogMetadata = saveCatalogMetadata;
exports.findUserByUsername = findUserByUsername;
exports.singupUser = singupUser;

// TODO temp exposure during development
exports.getUserCol = getUserCol;
exports.getCatalogCol = getCatalogCol;
exports.getWorksCol = getWorksCol;
exports.getPersonCol = getPersonCol;

/* END DAO READ/WRITE ********************************************************************************* */


/**
 * Holds the dummy ngrams.  demo-only as it will use a lot of memory
 */
//var personTtree;
//
///**
// * Maps person's name to its id  demo-only kludge
// */
//var personIds = {};
//
///**
// * Tries to autocomplete person's name.
// * @param queryString   The partial name
// * @returns {{persons: Array}} Array of matching person objects. Each object
// * includes the full name and the person's id.
// */
//function makePersonResults(queryString) {
//    var res = personTtree.prefixSearch(queryString),
//        data = {persons: []};
//    for (var i in res) {
//        var fullName = res[i], query = {fullName: fullName};
//        data.persons.push({fullName: fullName, _id: personIds[fullName]});
//    }
//    return data;
//}
//
///**
// * cachePersonTtree: caches all names into a tree
// */
//function cachePersonTtree(queryString, callback) {
//    personTtree = ternTree.ternarySearchTree();
//    getPersonCol().find({}, {fields: {fullName: 1}}).toArray(function (err, docs) {
//        if (err) {
//            callback({type: 'trans', msg: 'Failed to find persons'});
//        } else {
//
//            for (var i in docs) {
//                var doc = docs[i];
//                personTtree.add(doc.fullName);
//                personIds[doc.fullName] = doc._id;
//            }
//            callback(null, makePersonResults(queryString));
//        }
//    });
//}
//

//        var key; // creating an ObjectId from string id
//        try {
//            key = mongodb.ObjectID.createFromHexString(catalog._id);
//        } catch (e) {
//            throw {type: 'error', msg: 'Catalog item id "' + catalog._id + '" is an invalid id'};
//        }