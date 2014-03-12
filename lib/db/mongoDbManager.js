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

/**
 * Holds the dummy ngrams. TODO demo-only as it will use a lot of memory
 */
//var personTtree;
//
///**
// * Maps person's name to its id TODO demo-only kludge
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

//function saveContent(catalog, callback) {
//    if (catalog.content) {
//        if (catalog._id) {
//            getWorksCol().findOne({_id: catalog._id}, function (err, doc) {
//                if (err) {
//                    callback(appUtils.makeError({type: 'error', msg: 'Cannot find content for catalog id ' + catalog._id}, err));
//                } else if (doc) { // update
//                    getWorksCol().update({_id: catalog.id}, {$set: {content: catalog.content, catalogId: catalog._id}}, function (upError, docs) {
//                        if (upError) {
//                            callback(appUtils.makeError({type: 'trans', msg: 'Failed to update contents for catalog id ' + catalog._id}, upError));
//                        } else if (docs.length !== 0) {
//                            callback(null, {type: 'ack', msg: 'Updated catalog id ' + catalog._id + ' contents'})
//                        } else {
//                            callback({type: 'trans', msg: 'Could not find contents for catalog id ' + catalog._id});
//                        }
//                    });
//                } else { // insert
//                    getWorksCol().insert({_id: catalog._id, content: catalog.content}, function (insError, docs) {
//                        if (insError) {
//                            callback(appUtils.makeError({type: 'trans', msg: 'Failed to add contents for catalog id ' + catalog._id}, insError));
//                        } else {
//                            callback({type: 'ack', msg: 'Created catalog id ' + catalog._id + ' contents'});
//                        }
//                    });
//                }
//            });
//        } else {
//            callback({type: 'error', msg: 'Content missing catalog id'});
//        }
//    } else {
//        callback({type: 'error', msg: 'Missing content'});
//    }
//}

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
                    parseContentAndWrite(catalog, callback);
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
    if (items.length !== 0) {
        console.trace('bad command line #+' + lineNo + ': ' + line); // TODO
        return;
    }
    var level = 0, lastLevel, cmdParts = items[0].split(' ');
    for (i in cmdParts[0].trim()) {
        if (i !== 0) {
            if (line[i] === '!' && lastLevel === (i - 1)) {
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
        tocItem.chunkId = chunk[schema.definitions.fieldIds.id];
        if (chunk.chunks) {
            tocItem.chunks = [];
            for (var c in chunk.chunks) {
                var subchunk = chunk.chunks[c],
                    tocItemChunk = {};
                tocItem.chunks.push(tocItemChunk);
                makeTOCitem(subchunk, tocItemChunk);
            }
        }
    }
}
function parseContentAndWrite(catalog, callback) {
    var writer = new EventEmitter(),
        allLines = catalog.content.split('\n'),
        command = '#!',
        blockByteLimit = 32768, // approximate # bytes per block
        currBlockSize = 0, // # bytes in current block
        line, lineNo, cmd,
        level = 0, // level in a work
        title, // title of poem or section
        dataType, // Poem or Prose
        chunk = {}, // a chunk to save
        toc = [], // table of contents
        inPoem = false; // inside a poem; else inside prose
    // TODO test that the toc is in the right order (is it guaranteed by the event sys or not?)
    for (lineNo in lines) {
        line = allLines[lineNo];
        if (isEnd(line)) {
            writer.emit('data', catalog, toc, chunk, function (error, result) {
                if (error) {
                    console.trace('croaked');
                } else {
                    var tocItem = {};
                    makeTOCitem(chunk, tocItem);
                    toc.push(tocItem);
                }
            });
        } else if (isCommand(line)) {
            var cmdData = getCommandData(line, lineNo);
            if (level === 1) {
                if (chunk.title) { // old chunk ready to go
                    write.emit('data', toc, catalog, chunk, callback);
                    chunk = {}; // start new chunk
                }
            }
            title = cmdData.title;
            dataType = cmdData.dataType;
        } else {
            line = line.trimRight();
            if (line.length !== 0) {

            }
        }
    }
    parser.on('data', function (catalog, toc, chunk, callback) {
        if (chunk.length !== 0) {
            // write chunk as is
            var chunkId = uuid.v4();
            chunk.catalogId = catalog[schema.definitions.fieldIds.id];
            chunk[schema.definitions.fieldIds.id] = chunkId;
            getWorksCol().insert(chunk, function (error, docs) {
                if (error) {
                    callback(error);
                } else {
                    callback();
                }
            });

        }
    });
    parser.on('end', function (catalog, callback) {
    });
//    parser.on('error', function (err) {
//        console.trace('Failed parse and save')
//    });
    parseContentAndWrite1(catalog, callback)
}
/**
 * Parses catalog content and writes it to the DB. Terminology:
 * block := a block of data is the unit in which portions of the content are saved to the DB
 * @param catalog   The catalog object
 * @param lines The lines of content
 * @param callback  A callback
 * TODO instead of having content, it will have filepath/S3 where to read the contents
 * TODO if parsing a book (non-poem), paragraphs are separated by an empty line.
 * TODO delete db entries if they already exist (or mark them for later deletion)
 */
function parseContentAndWrite(catalog, lines, callback) {
    var id = catalog[schema.definitions.fieldIds.id],
        command = '#!',
        blockByteLimit = 32768, // approximate # bytes per block
        currBlockSize = 0, // # bytes in current block
        line, lineNo, cmd,
        title, // title of poem or section
        chunk, // current verse or paragraph
        chunks = [], // current verses or paragraphs (cummulative)
        inPoem = false; // inside a poem; else inside prose
    for (lineNo in lines) {

        line = lines[lineNo].trim();
        if (line.length === 0) {
            if (title) { // must be inside a title
                if (inPoem) { // new verse/par
                    if (chunk) { // last verse/par: save it
                        chunks.push(chunk);
                        currBlockSize += chunk.length;
                    }
                } else { // in prose
                    console.trace('parseContentAndWrite: prose not implemented')
                }
            }
        } else if (line.startsWith(command)) {
            cmd = getCommand(line);
            if (cmd[0] === 'End') {
                break;
            } else {
                inPoem = (cmd[0] === 'Poem');
                title = cmd[1];
                currBlockSize += title.length;
            }
        } else {

        }

        if (currBlockSize > blockByteLimit) {
            saveBlock(catalog, lines, title, chunks);
            chunk = undefined;
            chunks = [];
            currBlockSize = 0;
        }
    }

    if (currBlockSize > 0 && chunks.length !== 0) { // save remainder
        saveBlock(catalog, lines, title, chunks);
    }
}

exports.searchCatalog = searchCatalog;
exports.searchPerson = searchPerson;
exports.saveCatalogContent = saveCatalogContent;
exports.saveCatalogMetadata = saveCatalogMetadata;

// TODO temp exposure
exports.getUsersCol = getUsersCol;
exports.getCatalogCol = getCatalogCol;
exports.getWorksCol = getWorksCol;
exports.getPersonCol = getPersonCol;

/* END DAO READ/WRITE ********************************************************************************* */




//        var key; // creating an ObjectId from string id
//        try {
//            key = mongodb.ObjectID.createFromHexString(catalog._id);
//        } catch (e) {
//            throw {type: 'error', msg: 'Catalog item id "' + catalog._id + '" is an invalid id'};
//        }