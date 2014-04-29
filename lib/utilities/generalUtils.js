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

var
    uuid = require('../utilities/uuid.js'),

// Possible condition types
    conditionTypes = ['fatal', 'trans', 'error', 'warn', 'ack', 'note'],

// Condition types that should be logged with a stack trace
    logConditionTypes = ['fatal', 'trans'];

/**
 * Creates a condition object.
 * @param type The type of condition
 * @param msg Optional debugging message
 * @param props Optional properties that should be added to the condition object
 */
var DFLCondition = function (type, msg, props) {
    if (!type || conditionTypes.indexOf(type) === -1) {
        throw new DFLCondition('fatal', 'Invalid condition type: ' + type);
    }
    this.type = type;
    if (msg) {
        this.msg = msg;
    }
    var p, val;
    for (var p in props) {
        if (props.hasOwnProperty(p)) {
            this[p] = props[p];
        }
    }
    if (logConditionTypes.indexOf(type) !== -1) {
        console.error(this);
        console.trace();
    }
    return this;
};

/**
 * Creates a simple error message with the specified text.
 * @param text  The text
 * @param prefix    Optional prefix (to prepend to the text)
 * @param suffix    Optional suffix (to append to the text)
 * @returns {*}
 */
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

/**
 * Creates an error message based on some object.
 * 1. If no method is passed, an 'unknown' fatal error is created and returned.
 * 2. If the specified obj has a type and a msg property, its msg property is
 *    prefixed or suffixed, if necessary, and the obj is returned.
 * 3. If the specified obj has an 'arguments' and a 'type' property, a fatal
 *    error is created using the type property's value as the initial text in
 *    the error objects 'msg' property. The object is returned.
 * 4. Else, a fatal error with a 'msg' property packing the information in the object
 *    as well as a property 'error' with the object is created and returned.
 * @param obj   Optional object on which the error message should be based.
 * @param errorMsgSuffix    Optional suffix for the error message's msg property text (debugging)
 * @param errorMsgPrefix    Optional prefix for the error message's msg property text (debugging)
 * @returns {*}
 */
var makeError = function (obj, errorMsgSuffix, errorMsgPrefix) {
    var error;
    if (!obj) {
        error = new DFLCondition('fatal', makeErrorMsg('Unknown', errorMsgPrefix, errorMsgSuffix));
    } else if (obj.type && obj.msg) {
        obj.msg = makeErrorMsg(obj.msg, errorMsgPrefix, errorMsgSuffix);
        error = obj;
    } else if (obj['arguments'] && obj.type) {
        error = new DFLCondition('fatal', makeErrorMsg((obj.type) + ': ' + obj['arguments'].toString(), errorMsgPrefix, errorMsgSuffix));
    } else { // fallback adds original error message
        error = new DFLCondition('fatal', makeErrorMsg(JSON.stringify(obj), errorMsgPrefix, errorMsgSuffix), {error: obj});
    }
    return error;
};

/**
 * Creates a new UUID. The UUID's base is today's date
 * in YYMMDD format followed by a v4 UUID. This works better
 * for B-tree indexes than pure random ids.
 */
var makeUUID = function () {
    var date = new Date(),
        mo = (1 + date.getMonth()).toString(),
        dom = date.getDate().toString();
    return (
        date.getFullYear().toString() +
            (mo.length === 1 ? '0' + mo : mo) +
            (dom.length === 1 ? '0' + dom : dom) +
            uuid.v4()
        );
};

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
        throw  new DFLCondition('error', 'Invalid insertion of function');
    } else {
        var index;
        for (index in obj) {
            obj[index] = sanitizeObject(obj[index]);
        }
        return obj;
    }
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
var makeRandomId = function (idLength) {
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

exports.makeUUID = makeUUID;
exports.sanitizeObject = sanitizeObject;
exports.DFLCondition = DFLCondition;
exports.makeError = makeError;
exports.makeRandomId = makeRandomId;
exports.Stack = Stack;

/* txIdLength: Suggested length for transaction ids (TODO should be in server-config.js) */
exports.txIdLength = 6;