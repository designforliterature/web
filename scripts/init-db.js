// During early development, we are using MongoDB's text search. This lets us work with
// fewer resources and make progress. Eventually, search would be handled by a Apache SOLR service.

// Index a catalog item. DB: works, COLLECTION: catalog
db.catalog.ensureIndex({'title': 'text', authors: 'text', 'publisher.name': 'text', subjects: 'text'}, {
    name: "catalog_search",
    weight: {
        'title': 3,
        'subjects.text': 2,
        'publisher.name': 1
    }
});

// Index a person. DB: works, COLLECTION: person
/**
 * person fields:
 * _id: the record id (uuid.v4)
 * fullName: as complete a name as possible in locale-specific order (e.g., for most Western countries and
 * languages, last name first)
 * description: descriptive information about this person (helps users to identify them)
 */
db.person.ensureIndex({fullName: 'text'}, {
    name: "person_search"
});