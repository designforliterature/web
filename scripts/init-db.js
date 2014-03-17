// During early development, we are using MongoDB's text search. This lets us work with
// fewer resources and make progress. Eventually, search would be handled by a Apache SOLR service.

// mongodb js script for initializing db with dummy data
// To run: mongo --port 21191  init-db-populate.js

var conn = new Mongo('localhost:21191'),
    worksDb = conn.getDB('works'),
    usersDb = conn.getDB('users'),
    worksCol = worksDb.getCollection('work'),
    personCol = worksDb.getCollection('person'),
    catalogCol = worksDb.getCollection('catalog'),
    userCol = usersDb.getCollection('user'),
    publisherCol = worksDb.getCollection('publisher');

userCol.remove();

worksCol.remove();

catalogCol.remove();
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
personCol.remove();
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
publisherCol.remove();
publisherCol.dropIndexes();

publisherCol.ensureIndex({companyName: 'text', imprints: 'text'}, {
    name: "publisher_search"
});