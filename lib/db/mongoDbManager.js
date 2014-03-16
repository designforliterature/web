/**
 The MIT License (MIT)

 Copyright (c) 2014 Ruben Kleiman

 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


// SERVER SIDE --------------------------------------------------------------------------------------------

/**
 * Manages MongoDB database connection pool and access
 * to its databases.
 */
"use strict";

var appUtils = require('../utilities/generalUtils.js'),
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
 * usersCol: user profiles
 * worksCol: works' content
 * catalogCol: catalog items
 * personCol: authors, editors, and registered names
 */
var usersCol, worksCol, catalogCol, personCol;

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
function getUsersCol() {
    if (!usersCol) {
        usersCol = getDB('users').collection('users');
    }
    return usersCol;
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

/* START DAO READ/WRITE ********************************************************************************* */

function createCatalog(session, catalog, callback) {
    catalog._id = uuid.v4(); // create v4 uuid as catalog item key
    getCatalogCol().insert(catalog, insertUpdateOptions, function (err, doc) {
        if (err) {
            callback(appUtils.makeError({type: 'fatal', msg: 'Failed to create catalog item. '}, err));
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
            callback(appUtils.makeError({type: 'trans', msg: 'Failed to update catalog item id ' + catalogId, data: {catalogId: catalogId}}, err));
        } else if (count > 0) { // successful update
            callback(null, {type: 'ack', msg: 'Updated catalog item id ' + catalogId, created: false, data: {catalogId: catalogId}});
        } else {
            callback({type: 'trans', msg: 'Catalog item id ' + catalogId + ' not updated because it does not exist', data: {catalogId: catalogId}});
        }
    });
}


var searchCatalog = function (query, callback) {
    doSearch('works', 'catalog', query, 'data', callback);
};


var searchPerson = function (query, callback) {
//    if (query.suggest && query.suggest === 'true') {
//        if (!personTtree) {
//            try {
//                cachePersonTtree(query.name, callback);
//            } catch (error) {
//                callback(error);
//            }
//        } else {
//            callback(null, makePersonResults(query.name));
//        }
//    } else { // tokenized index search
//        doSearch('works', 'person', query.name, 'persons', callback, true, null, {fullName: 1, description: 1});
//    }
    doSearch('works', 'person', query.name, 'persons', callback, true, null, {fullName: 1, description: 1});
};

/**
 * Strips result objects from search results array
 * @param array An array returned by a text search
 * @returns {Array} An array containing only the objects found in the search (no scores, etc.)
 */
function getSearchResultObjectArray(array) {
    if (array.length === 0) {
        return array;
    }
    var result = [];
    for (var i in array) {
        result.push(array[i].obj);
    }
    return result;
}

/**
 * Text search for specified db and collection. TODO add options for fields to return
 * @param dbName    The db name
 * @param collectionName    The collection name
 * @param query The query
 * @param resultsFieldName The name of the field where the results payload (an array) will be placed
 * @param callback Callback with error arg and results arg. The result is a
 * ready-name condition object.
 * @param stripObjects If true, objects are stripped from search results (i.e., scores, etc, are
 * ommitted from the result array)
 * @param transform Optional: a function that takes the result object and returns a result object
 * This permits the client to arbitrarily transform the result object.
 * @param fieldsToReturn An object specifying which fields should be returned (e.g., {foo: 1, bar: 1}
 * returns fields foo and bar, if they exist)
 */
var doSearch = function (dbName, collectionName, query, resultsFieldName, callback, stripObjects, transform, fieldsToReturn) {
    if (!fieldsToReturn) {
        fieldsToReturn = {};
    }
    getDB(dbName).command({text: collectionName, search: query, project: fieldsToReturn}, function (error, result) {
        if (error) {
            error = appUtils.makeError({type: 'trans', msg: 'Search failed'}, ': ' + error.name + ' ' + error.message);
            callback(error, null);
        } else { // result.results is always an array
            var final = stripObjects ? getSearchResultObjectArray(result.results) : result.results;
            var r = {type: 'ack', msg: result.results.length + ' results found'};
            r[resultsFieldName] = final
            if (transform) {
                r = transform(r);
            }
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
        callback(appUtils.makeError({type: 'fatal', msg: 'Failed to save catalog metadata. '}, err));
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
                    callback(appUtils.makeError({type: 'error', msg: 'Cannot find content for catalog id ' + catalog._id}, err));
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
        if (chunk.sections) {
            tocItem.sections = [];
            for (var c in chunk.sections) {
                var subchunk = chunk.sections[c],
                    tocItemChunk = {};
                tocItem.sections.push(tocItemChunk);
                makeTOCitem(subchunk, tocItemChunk);
            }
        }
    }
}

var contentWriter = new EventEmitter();

contentWriter.on('data', function (catalog, chunk, callback) {
    if (chunk.length !== 0) {  // write chunk as is (convenient with mongodb)
        if (chunk.data && chunk.data.length === 1 && chunk.data[0].length === 0) {
            delete chunk.data;
        }
        if (chunk.sections && chunk.sections.length !== 0) {
            for (var s in chunk.sections) {
                var data = chunk.sections[s].data;
                if (data && data.length !== 0 && data[0].length === 0) {
                    delete chunk.sections[s].data;
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
        chunkProcessStack = new appUtils.Stack(), // a stack of chunks
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
                    var topChunk = chunkProcessStack.bottom();
                    topChunk.catalogId = catalog[schema.definitions.fieldIds.id]; // TODO don't need this field if we assume a convention
                    topChunk.id = firstChunk ? topChunk.catalogId : uuid.v4();
                    topChunk[schema.definitions.fieldIds.id] = topChunk.id;  // TODO redundancy simply due to uniform labeling... but hm..
                    firstChunk = false;
                    var tocItem = {};
                    makeTOCitem(topChunk, tocItem);
                    toc.push(tocItem);
                    contentWriter.emit('data', catalog, topChunk, function (error, result) {
                        if (error) {
                            console.trace('data error'); // TODO handle this
                        } else {
                            // ignore result... but could be used to count good results and resolve at end
                            // would have an event listener that has the total expected and listens to the countdown
                            // and resolves the transaction when total is reached or eventually times out and signals error
                            // not having real threads is not so great
                        }
                    });
                }
                chunkProcessStack = new appUtils.Stack({title: cmdData.title, dataType: cmdData.dataType});
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
                if (!parentChunk.sections) {
                    parentChunk.sections = [];
                }
                var subchunkId = appUtils.makeId(schema.definitions.subchunkKeyLength);
                var newChunk = {title: cmdData.title, dataType: cmdData.dataType, id: subchunkId};
                parentChunk.sections.push(newChunk);
                chunkProcessStack.push(newChunk);

                var topChunk = chunkProcessStack.bottom();
            }
            lastLevel = cmdData.level;
        } else { // chunk data
            var chunk = chunkProcessStack.peek();
            if (!chunk.data) {
                chunk.data = [];
            }
            chunk.data.push(line);
        }
    }
    if (chunkProcessStack.size() !== 0) {
        var topChunk = chunkProcessStack.bottom();
        topChunk.catalogId = catalog[schema.definitions.fieldIds.id];
        topChunk[schema.definitions.fieldIds.id] = firstChunk ? topChunk.catalogId : uuid.v4();
        var tocItem = {};
        makeTOCitem(topChunk, tocItem);
        toc.push(tocItem);
        contentWriter.emit('data', catalog, topChunk, function (error, result) {
            if (error) {
                console.trace('data error'); // TODO
            } else { // ignore result
                var query = {};
                query[schema.definitions.fieldIds.id] = catalog[schema.definitions.fieldIds.id];
                getWorksCol().update(query, {$set: {toc: toc}}, function (error, doc) {
                    if (error) {
                        console.trace('error updating');
                    } else {
                        // TODO
                    }
                });
            }
        });
    }
}


exports.searchCatalog = searchCatalog;
exports.searchPerson = searchPerson;
exports.saveCatalogContent = saveCatalogContent;
exports.saveCatalogMetadata = saveCatalogMetadata;

// TODO temp exposure during development
exports.getUsersCol = getUsersCol;
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