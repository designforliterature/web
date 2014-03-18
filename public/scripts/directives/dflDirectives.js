/*
 The MIT License (MIT)

 Copyright (c) 2014 Ruben Kleiman

 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

/*
 * General-purpose directives.
 */
'use strict';

/**
 * dflSetFocus: sets focus on the specified element
 */
horaceApp.directive('dflSetFocus', function () {
    return {
        restrict: 'A', // matches attribute dfl-set-focus only
        link: function (scope, element, attrs, ctrl) {
            element[0].focus();
        }
    };
});

/**
 * dflCatSearchResult: expands a dfl-cat-search-result element
 */
horaceApp.directive('dflCatSearchResult', function ($state) {

    /* currScope: the current scope */
    var currScope = undefined;

    /**
     * Takes the work chunk to the editor/viewer
     * Note: must be defined here so be in scope of the $state variable
     * @param chunkId The chunk id
     */
    dflGlobals.goEdit = function (chunkId) {
        var toplevelSearchResults = $('#toplevelSearchResults');
        if (toplevelSearchResults) { // clear results from toplevel search box
            toplevelSearchResults.css('display', 'none');
        }
        $state.go('work', {id: chunkId});
    };

    /**
     * Prints html for publisher citation
     * @param publisher    The publisher object
     * @param searchResultObj   The search result object (with all fields)
     */
    function makePublisherHTML(publisher, searchResultObj) {
        var html = ' (', haveOne = false;
        if (publisher.city) {
            html += publisher.city;
            haveOne = true;
        }
        if (publisher.province) {
            if (haveOne) {
                html += ', ';
            }
            haveOne = true;
            html += publisher.province;
        }
        if (publisher.country) {
            if (haveOne) {
                html += ', ';
            }
            haveOne = true;
            html += publisher.country;
        }
        if (publisher.name) {
            if (haveOne) {
                html += ': ';
            }
            haveOne = true;
            html += publisher.name;
        }
        if (publisher.year) {
            if (haveOne) {
                html += ', ';
            }
            html += publisher.year;
        }
        return html + ')';
    }

    /**
     * Creates the HTML for a search result object.
     * @param searchResultObj   The search result object
     * @param element   The HTML element to which the HTML must be added
     * @param attrs Attributes of the element
     * @param index The index for the selected item in the ng-repeat array
     */
    function displaySearchResultHTML(searchResultObj, element, attrs, index) {
        var fieldSpecs = dflGlobals.catalogFieldSpecs,
            citationOrder = fieldSpecs.workType.specs[searchResultObj.workType].citationOrder,
            fieldName, fieldValue, haveAuthors = false,
            html = (index === 0) ? '<div>' : '<div style="margin-top: -4px">';
        for (var i in citationOrder) {
            fieldName = citationOrder[i];
            fieldValue = searchResultObj[fieldName];
            if (fieldValue) {
                switch (fieldName) {
                    case dflGlobals.fieldIds.authors:
                        for (var j in fieldValue.data) {
                            var author = fieldValue.data[j];
                            if (j > 0) {
                                html += ' and ';
                            }
                            html += '<a class="citation" href="' + author[fieldSpecs.id.id] + '">' + author.fullName + '</a>';
                        }
                        html += ', ';
                        haveAuthors = true;
                        break;
                    case dflGlobals.fieldIds.editors:
                        if (haveAuthors) {
                            html += '[';
                        }
                        var count = fieldValue.data.length;
                        for (var j in fieldValue.data) {
                            var editor = fieldValue.data[j];
                            if (j > 0) {
                                html += ' and ';
                            }
                            html += '<a class="citation" href="' + editor[fieldSpecs.id.id] + '">' + editor.fullName + '</a>';
                        }
                        html += ((count === 1) ? ' ed.' : ' eds.') + (haveAuthors ? ']' : '');
                        break;
                    case dflGlobals.fieldIds.lang:
                        html += ' [in ' + dflGlobals.isoLangs[fieldValue].name + ']';
                        break;
                    case dflGlobals.fieldIds.publisher:
                        html += makePublisherHTML(fieldValue, searchResultObj);
                        break;
                    case dflGlobals.fieldIds.title:
                        html += '<a class="citation" onclick="dflGlobals.goEdit(&quot;' + searchResultObj[fieldSpecs.id.id] + '&quot;)"><i> ' + fieldValue + '</i></a> ';
                        break;
                    case dflGlobals.fieldIds.workType:
                        break;
                }
            }
        }
        element[0].innerHTML = html + '</div>';
    }

    return {
        restrict: 'E', // matches only element dfl-cat-search-result only
        link: function (scope, element, attrs) {
            currScope = scope;
            displaySearchResultHTML(scope.result.obj, element, attrs, scope.$index);
        }
    };
});

/*
 * Directive used to validate catalog metadata form
 */
horaceApp.directive('catalogField', function () {

    function checkRequired(scope, fieldId, fieldValue) {
        var specs = dflGlobals.shared.workTypeCatalogFieldSpecs[scope.catalog.postData.metadata.workType];
        var valid = true;
        for (var i in specs) {
            var spec = specs[i];
            if (spec.required) {
                var id = specs[i].id;
                var value = (id === fieldId) ? fieldValue : scope.catalog.postData.metadata[id];
                if (typeof value === 'undefined' || value.length === 0) {
                    valid = false;
                }
            }
        }
        if (scope.catalog.metatadaValid !== valid) { // prevent unnecessary trigger
            scope.catalog.metatadaValid = valid;
        }
    }

    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(
                function (fieldValue) {
                    checkRequired(scope, attrs.name, fieldValue);
                    return fieldValue;
                });
        }
    }
});

/*
 * Directive used to validate signup and signin input fields.
 */
horaceApp.directive('signinField', function () {

    var USERNAME_REGEXP = /^[A-Za-z0-9\.\,\!\\@\#\$\%\^\&\*\(\)\-\_\+\=]{3,32}$/,
        PASSWORD_REGEXP = /^(?=(.*[a-z]){1,})(?=(.*[A-Z]){1,})(?=(.*[\d]){1,})(?=(.*[\!\@\$\^\*\(\)\-\_\+\=\,\.\: ]){1,})(?!.*\s).{8,32}$/,
        EMAIL_REGEXP = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

    /**
     * Validation function using a regexp for validation.
     * @param {object} ctrl  The controller
     * @param {string} fieldName  The name of the field (e.g., username)
     * @param {string} text  The text to validate
     * @param {RegExp} regexp    The regexp to use to validate the text
     * @returns Returns the text if it is valid, else returns undefined.
     */
    function validate(scope, ctrl, fieldName, text, regexp) {
        var ok = (text !== undefined) && regexp.test(text);
        scope[scope.dfl_scopeFieldName].error = !ok;
        ctrl.$setValidity(fieldName, ok);
        return ok ? text : undefined;
    }

    /**
     * Confirms that the password has been correctly retyped.
     * @param {string} The confirmed password.
     * @param {object} The controller
     * @returns {string}   Returns the password if the entered password and the
     * confirmed one are exactly the same; else returns undefined
     */
    function confirmPassword(password, ctrl, scope) {
        var dflscopeFieldName = scope.dfl_scopeFieldName,
            value = (scope[ dflscopeFieldName].user && scope[dflscopeFieldName].user.password),
            ok = (password && (password === value));
        if (!ok) {
            scope[dflscopeFieldName].msg = 'Must confirm password';
        }
        scope[dflscopeFieldName].error = !ok;
        ctrl.$setValidity('confirm', ok);
        return ok ? password : undefined;
    }

    return {
        require: 'ngModel',
        validate: validate,
        link: function (scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(
                function (fieldValue) {
                    if (attrs.id === 'confirm') {
                        return confirmPassword(fieldValue, ctrl, scope);
                    }
                    var isUsername = (attrs.id === 'username'),
                        isEmail = (attrs.id === 'email'),
                        valid = validate(scope, ctrl, attrs.id, fieldValue, (isUsername ? USERNAME_REGEXP : (isEmail ? EMAIL_REGEXP : PASSWORD_REGEXP)));
                    if (valid === undefined) {
                        var minLength = (isUsername ? 3 : 8);
                        if (isEmail) {
                            scope[scope.dfl_scopeFieldName].msg = 'Email address invalid';
                        } else if (fieldValue && fieldValue.length < minLength) {
                            scope[scope.dfl_scopeFieldName].msg = 'At least ' + minLength + ' characters';
                        } else if (fieldValue && fieldValue.length > 32) {
                            scope[scope.dfl_scopeFieldName].msg = 'No more than 32 characters';
                        } else {
                            scope[scope.dfl_scopeFieldName].msg = 'Get ' + attrs.id + ' help';
                        }
                    }
                    return valid;
                });
        }
    };
});