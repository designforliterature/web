// During early development, we are using MongoDB's text search. This lets us work with
// fewer resources and make progress. Eventually, search would be handled by a Apache SOLR service.

// Index a catalog item. DB: works, COLLECTION: catalog
db.catalog.ensureIndex({'title': 'text', authors: 'text', 'publisher.name': 'text', subjects: 'text'}, {
    name: "catalog_search",
    weight: {
        'title': 3,
//        'authors.fullname': 2, // TODO won't work: authors is now an array, but of objects that include fullName with what we want
        'subjects.text': 2,
        'publisher.name': 1
    }
});