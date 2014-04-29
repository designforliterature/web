/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */


// SERVER SIDE --------------------------------------------------------------------------------------------

'use strict';

/**
 * Person database for authors, editors, and other identified persons.
 */

var express = require('express'),
    generalUtils = require('../utilities/generalUtils.js'),
    search = require('../search/searchManager.js');

exports.personService = {

    /* search: searches catalog per query */
    search: function (query, callback) {
        try {
            search.searchPerson(query, callback);
        } catch (error) {
            callback(generalUtils.makeError(error));
        }
    }
};