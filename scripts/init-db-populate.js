/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// mongodb js script for initializing db with dummy data
// To run: mongo --port 21191  init-db-populate.js

var conn = new Mongo('localhost:21191'),

    worksDb = conn.getDB('works'),
    usersDb = conn.getDB('users'),

    userCol = usersDb.getCollection('user'),
    personCol = worksDb.getCollection('person'),
    publisherCol = worksDb.getCollection('publisher'),
    worksCol = worksDb.getCollection('works');

userCol.insert({username: 'Ruben', password: 'Tsukiko1!'});

personCol.insert({fullName: 'Catullus, Gaius Valerius', description: 'Catullus (b. c. 84 BCE) was a poet of the late Roman Republic who wrote in the neoteric style of poetry'});
personCol.insert({fullName: 'Flaccus, Quintus Horatius', description: 'Horace (b. December 8, 65 BCE) was the leading Roman lyric poet during the time of Augustus', altNames: 'Horace'});
personCol.insert({fullName: 'Maro, Publius Virgilius', description: 'Vergil (b. October 15, 70 BCE) was a poet of the Augustan period' , altNames: 'Virgil Vergil'});
personCol.insert({fullName: 'Homer', description: 'Homer is the author of the Iliad and the Odyssey'});
personCol.insert({fullName: 'Archilochus', description: 'Archilochus (b. c. 680 BCE) was a Greek lyric poet from the island of Paros in the Archaic period'});
personCol.insert({fullName: 'Aristophanes', description: 'Aristophanes (b. c. 446 BCE) was a comic playwright of classical Athens'});
personCol.insert({fullName: 'Aeschylus', description: 'Aeschylus (b. c. 525/524 BCE) was the first Athenian dramatist with extant works'});
personCol.insert({fullName: 'Sophocles', description: 'Sophocles (b. c. 497/6 BCE) is one of three classical Greek tragedians with extant works'});
personCol.insert({fullName: 'Euripedes', description: 'Eripedes (b. c. 480 BCE) is one of the three classical Green tragedians with extant works'});
personCol.insert({fullName: 'Aesop', description: "Aesop (b. 620 BCE), creator of Aesop's tales"});
personCol.insert({fullName: 'Homer', description: 'Homer is a 20th century cartoon character, member of the Simpson family'});

personCol.insert({fullName: 'Merrill, Elmer Truesdell', description: 'Late Rich Professor of Latin in Wesleyan University'});
personCol.insert({fullName: 'Kleiman, Ruben', description: 'Hubby'});
//personCol.insert({fullName: '', description: ''});


publisherCol.insert({companyName: 'Harvard University Press', url: 'http://www.hup.harvard.edu', phone: '617-495-2600', fax: '617-496-4677', address: '79 Garden St., Cambridge, MA, US', city: 'Cambridge', province: 'Massachusetts', country: 'US', imprints: ['Belknap Press', 'Harvard University Press']});
//publisherCol.insert({companyName: '', url: '', phone: '', fax: '', address: '', city: '', province: '', country: '', imprints: []});

publisherCol.insert({companyName: 'Random House', url:'http://www.randomhouse.com', phone: '(212) 782-9000', fax: '(212) 572-6066', address: '1745 Broadway, NY, NY, 10019', city: 'New York', province: 'New York', country: 'US', imprints: [
    'Alfred A. Knopf',
    'Alfred A. Knopf',
    "American Heart Association (Books)",
    "Anchor Bible Commentary",
    "Anchor Bible Dictionary",
    "Anchor Bible Reference Library",
    "Anchor Books",
    "Baedeker Guides",
    "Ballantine Books",
    "Ballantine Wellspring",
    "Bantam Books",
    "Bantam Classics",
    "Bantam Crime Line",
    "Bantam Dell Publishing Group",
    "Bantam Fanfare",
    "Bantam Hardcover",
    "Bantam Mass Market",
    "Bantam Skylark",
    "Bantam Spectra",
    "Bantam Starfire",
    "Bantam Trade Paperback",
    "BDD Audio Publishing",
    "Bell Tower",
    "Bon Appetit Books",
    "Broadway Books",
    "Children's Classics",
    "Children's Media",
    "Clarkson Potter Publishers",
    "Compass American Guides",
    "Crescent Books",
    "Crimeline",
    "Crown",
    "Crown Business",
    "Crown Children's Books",
    "Crown Forum",
    "Crown Journeys",
    "Crown Publishers",
    "CTW Publishing",
    "Currency",
    "David McKay",
    "DD Equestrian Library",
    "Del Rey Books",
    "Del Rey/Lucas",
    "Delacorte Books For Young Readers",
    "Delacorte Press",
    "Dell Books",
    "Dell Hardcovers",
    "Dell Laurel-Leaf",
    "Dell Yearling",
    "Delta",
    "Derrydale",
    "Dial Press",
    "Discovery Books",
    "Dolphin Books",
    "Domain",
    "Double D Western",
    "Doubleday",
    "Doubleday Activity Books",
    "Doubleday Bible Commentary",
    "Doubleday Books",
    "Doubleday Books For Young Readers",
    "Doubleday Broadway Publishing Group",
    "Doubleday Crime Club",
    "Doubleday Graphic Novels",
    "Dragonfly Books",
    "DTP",
    "Everyman's Library",
    "Family Circle Books",
    "Fanfare",
    "Fawcett Books",
    "First Choice Chapter Books",
    "Fodor's",
    "Forum",
    "Foundation Books",
    "Galilee Books",
    "Golden Books",
    "Gourmet Books",
    "Gramercy Books",
    "Harlem Moon/Black Ink",
    "Harlem Moon/Broadway",
    "Harmony Books",
    "House of Collectibles",
    "Image Books",
    "Island Books",
    "Ivy",
    "Jerusalem Bible",
    "Karen Brown Guides",
    "Knopf",
    "Knopf Children's Books",
    "Knopf Travel Guides",
    "Kovel's",
    "Laurel-Leaf Books",
    "Library of Contemporary Thought",
    "Living Language",
    "Loveswept",
    "Lucas Books",
    "Main Street Books",
    "Modern Library",
    "Nan A. Talese",
    "National Audubon Guides",
    "New Jerusalem Bible (The)",
    "One World",
    "One World/Strivers Row",
    "Outdoor Bible Series",
    "Pantheon Books",
    "Perfect Crime",
    "Pillsbury",
    "Presidio Press",
    "Prima",
    "Princeton Review",
    "Random House",
    "Random House Adult Trade",
    "Random House Audio",
    "Random House Children's Books",
    "Random House Large Print",
    "Random House Puzzles and Games",
    "Random House Reference",
    "Random House Trade Paperbacks",
    "Random House Value Publishing",
    "Random House Websters",
    "Schocken Books",
    "Shaw Books",
    "Shaye Areheart Books",
    "Sierra Club Adult Books",
    "Skylark",
    "Spectra",
    "Spy Books",
    "Starfire",
    "Strivers Row",
    "Testament Books",
    "Three Leaves Press",
    "Three Rivers Press",
    "Times Books",
    "Vanguard Press",
    "Villard Books",
    "Villard Books Trade Paperbacks",
    "Vintage Books",
    "Vintage Contemporaries",
    "Vintage Crime/Black Lizard",
    "Vintage Departures",
    "Vintage Hardcover",
    "Vintage International",
    "Vintage Spiritual Classics",
    "Waterbrook Press",
    "Wellspring",
    "Wendy Lamb Books",
    "Wings Books",
    "Yearling Books"
]});