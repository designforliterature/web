/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

'use strict';

module.exports = function (env) {
    return {
        development: {
            db: {
                poolSize: 5,
                host: "localhost",
                port: 21191,
                options: {
                    writeConcern: "majority",
                    readPreference: "primary",
                    safe: "true",
                    slaveOk: false,
                    fsync: true
                },
                dbNames: ["users", "session", "works", "notes"],
                sessionDb: "session",
                verbose: true
            },
            rest: {
                port: 3000,
                session: {
                    key: "dfls",
                    maxAge: 1800000, // 1800000
                    secret: "!0p3ns3sam3!",
                    verbose: true
                },
                verbose: true
            }
        },

        production: {
            db: {
                poolSize: 200,
                host: "localhost",
                port: 21191,
                options: {
                    w: "majority",
                    readPreference: "primary",
                    safe: "true",
                    slaveOk: false,
                    fsync: true
                },
                dbNames: ["users", "session", "works", "notes"],
                sessionDb: "session",
                verbose: true
            },
            rest: {
                port: 3000,
                session: {
                    key: "dfls",
                    maxAge: 1800000,
                    secret: "!0p3ns3sam3!",
                    verbose: true
                },
                verbose: true
            }
        },

        testing: {
            db: {
                poolSize: 20,
                host: "localhost",
                port: 21191,
                options: {
                    writeConcern: "majority",
                    readPreference: "primary",
                    safe: "true",
                    slaveOk: false,
                    fsync: true
                },
                dbNames: ["users", "session", "works", "notes"],
                sessionDb: "session",
                verbose: true
            },
            rest: {
                port: 3000,
                session: {
                    key: "dfls",
                    maxAge: 1800000,
                    secret: "!0p3ns3sam3!",
                    verbose: true
                },
                verbose: true
            }
        }
    }[env];
}