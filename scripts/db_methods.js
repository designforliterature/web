/**
 * Some useful methods
 */

var m = db.getMongo(),
    works = m.getDB('works').getCollection('works'),
    catalog = m.getDB('works').getCollection('catalog'),
    person = m.getDB('works').getCollection('person'),
    publisher = m.getDB('works').getCollection('publisher'),
    user = m.getDB('users').getCollection('user'),
    session = m.getDB('session').getCollection('sessions');

function findCatalogId(id) {
    print(JSON.stringify(catalog.findOne({_id: id}), null, 4));
}

function findCatalogTitle(title) {
    print(JSON.stringify(catalog.findOne({title: title}), null, 4));
}

function findChunkTitle(title) {
    print(JSON.stringify(works.findOne({title: title}), null, 4));
}

function findChunkId(id) {
    print(JSON.stringify(works.findOne({_id: id}), null, 4));
}

function findSession(username) {
    print(JSON.stringify(session.findOne({"session.username": username}), null, 4));
}

