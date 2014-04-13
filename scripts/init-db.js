/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// During early development, we are using MongoDB's text search. This lets us work with
// fewer resources and make progress. Eventually, search would be handled by a Apache SOLR service.

// mongodb js script for initializing db with dummy data
// To run: mongo --port 21191 db_methods.js init-db.js init-db-populate.js

var conn = new Mongo('localhost:21191'),

    worksDb = conn.getDB('works'),
    usersDb = conn.getDB('users'),
    sessionDb = conn.getDB('session'),

    sessionCol = sessionDb.getCollection('sessions'),
    workCol = worksDb.getCollection('works'),
    personCol = worksDb.getCollection('person'),
    catalogCol = worksDb.getCollection('catalog'),
    userCol = usersDb.getCollection('user'),
    publisherCol = worksDb.getCollection('publisher');

// Clear collections
sessionCol.remove();
workCol.remove();
personCol.remove();
catalogCol.remove();
userCol.remove();
publisherCol.remove();

catalogCol.dropIndexes();

// Index a catalog item. DB: works, COLLECTION: catalog
catalogCol.ensureIndex({'title': 'text', 'authors.keywords': 'text', 'subjects.keywords': 'text', 'publisher.name': 'text'}, {
    name: "catalog_search",
    weight: {
        'title': 4,
        'authors.keywords': 3,
        'subjects.keywords': 2,
        'publisher.name': 1
    }
});

// Index a person. DB: works, COLLECTION: person
personCol.dropIndexes();
/**
 * person fields:
 * _id: the record id (uuid.v4)
 * fullName: as complete a name as possible in locale-specific order (e.g., for most Western countries and
 * languages, last name first)
 * altName: alternate names (e.g., in various languages)
 * description: descriptive information about this person (helps users to identify them)
 */
personCol.ensureIndex({fullName: 'text', altNames: 'text'}, {
    name: "person_search"
});


// Index publishers
publisherCol.dropIndexes();

publisherCol.ensureIndex({companyName: 'text', imprints: 'text'}, {
    name: "publisher_search"
});