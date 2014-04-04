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
 * Escapes XML-style markup and optionally checks the length of the text.
 * If specified object is an array, each object is in the array is recursively sanitized.
 * If it is a js object, each subobject is recursively sanitized.
 * Any other type of object is simply returned.
 * @param obj An object.
 * @returns {Array} Returns the same array, sanitized.
 * @throws Error if there's an attempt to insert a function
 */
var sanitizeObject = function (obj) {
    var type = (typeof obj);
    if (type === 'string') {
        return obj.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } else if (type === 'boolean' || type === 'number' || type === 'function' || type === 'undefined') {
        return obj;
    } else if (type === 'function') {
        throw {type: 'error', msg: 'Invalid insertion of function'};
    } else {
        var index;
        for (index in obj) {
            obj[index] = sanitizeObject(obj[index]);
        }
        return obj;
    }
};

function makeErrorMsg(text, prefix, suffix) {
    var msg = text;
    if (prefix) {
        msg = prefix.toString() + msg;
    }
    if (suffix) {
        msg += suffix.toString();
    }
    return msg;
}

var makeError = function (obj, errorMsgSuffix, errorMsgPrefix) {
    var error;
    if (!obj) {
        error = {type: 'fatal', msg: makeErrorMsg('Unknown', errorMsgPrefix, errorMsgSuffix)};
    } else if (obj.type && obj.msg) {
        obj.msg = makeErrorMsg(obj.msg, errorMsgPrefix, errorMsgSuffix);
        error = obj;
    } else if (obj['arguments'] && obj.type) {
        error = {type: 'fatal', msg: makeErrorMsg((obj.type) + ': ' + obj['arguments'].toString(), errorMsgPrefix, errorMsgSuffix) };
    } else { // fallback adds original error message
        error = {type: 'fatal', msg: makeErrorMsg(JSON.stringify(obj), errorMsgPrefix, errorMsgSuffix), error: obj};
    }
    console.trace(error); // log this!
    return error;
};

var alphanumericCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var idCharsLength = alphanumericCharacters.length;


/**
 * Creates an id of the specified length. Id is
 * randomized set of aphanumeric characters. This should
 * only be used in ephemeral contexts: it is not a GUID!
 * @param idLength The number of characters in the id
 * @returns {string}    The id
 */
var makeId = function (idLength) {
    var id = [];
    var i;
    for (i = 0; i < idLength; i += 1) {
        var rand = Math.floor(Math.random() * idCharsLength);
        id.push(alphanumericCharacters[rand]);
    }
    return id.join('');
};

var Stack = function (item) {
    this.stack = item ? [item] : [];
    this.size = function () {
        return this.stack.length;
    };
    this.bottom = function () {
        return (this.stack.length === 0) ? null : this.stack[0];
    };
    this.push = function (item) {
        this.stack.push(item);
    };
    this.peek = function () {
        if (this.stack.length === 0) {
            return null;
        }
        return this.stack[this.stack.length - 1];
    };
    this.pop = function () {
        var item = this.peek();
        if (item !== null) {
            this.stack.splice(this.stack.length - 1);
        }
        return item;
    };
};

//exports.pprint = pprint;
exports.sanitizeObject = sanitizeObject;
exports.makeError = makeError;
exports.makeId = makeId;
exports.Stack = Stack;

/* txIdLength: Suggested length for transaction ids (TODO should be in server-config.js) */
exports.txIdLength = 6;