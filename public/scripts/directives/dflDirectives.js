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
horaceApp.directive('dflCatSearchResult', function () {

    return {
        restrict: 'E', // matches only element dfl-cat-search-result only
//        template: 'openOneAtATime: {{catalog.openOneAtATime}}'
//        templateUrl: 'template/catalogSearchResultTemplate.html',
        link: function (scope, element, attrs) {
            var f = scope.catalog.printSearchResult;
            scope.catalog.printSearchResult(scope.result.obj, element,attrs);
//            var mainObjectSpecs = client.shared.catalogFieldSpecs;
//            var subObjectSpecs = client.shared.catalogFieldSubSpecs;
//            var searchResultObj = scope.result.obj;
//            var sortedResults = [];
//            for (var fieldId in searchResultObj) {
//                var fieldValue = searchResultObj[fieldId];
//                var spec = mainObjectSpecs[fieldId];
//                if (spec) {
//                    var sortObject = {id: fieldId, val: fieldValue};
//                    sortedResults.push({rank: spec.rank, data: sortObject});
//                }
//            }
//            clientApp.dfUtils.insertSort(sortedResults, 'rank')
//            var orderedResultItems = [];
//            for (var fieldId in sortedResults) {
//                orderedResultItems.push(sortedResults[fieldId].data);
//            }
//            var html = '<div style="margin-top: .5em">';
////            var len = orderedResultItems.len - 1; // minus _id
//            var count = 0;
//            for (var fieldSpecKey in orderedResultItems) {
//                var mainSpec = orderedResultItems[fieldSpecKey];
//                var mainSpecId = mainSpec.id;
//                var prettyFun = mainObjectSpecs[mainSpecId].prettyFun;
//                var mainSpecValue = mainSpec.val;
//                if (mainSpecId !== '_id' && mainSpecId !== 'content') { // TODO remove 'content' when content is moved to the works collection
//                    if ($.isArray(mainSpecValue)) {
//                        var subHtml = '<span><b>' + mainObjectSpecs[mainSpecId].name + ': </b></span>';
//                        for (var specSubObjectKey in mainSpecValue) {
//                            var subObject = mainSpecValue[specSubObjectKey];
//                            for (var subObjectKey in subObject) {
//                                var subObjectSpec = subObjectSpecs[subObjectKey];
//                                var value = subObject[subObjectKey];
//                                subHtml += prettyFun(searchResultObj, mainSpecId, subObjectSpec.subIdName || subObjectSpec.name, value, true, 'i');
//                            }
//                        }
//                        html += subHtml;
//                    } else if (typeof mainSpecValue !== 'string') {
//                        var subHtml = '<span><b>' + subObjectSpecs[mainSpecId].name + ': </b></span>';
//                        for (var subspecKey in mainSpecValue) {
//                            var value = mainSpecValue[subspecKey];
//                            subHtml += prettyFun(searchResultObj, mainSpecId, subObjectSpecs[subspecKey].name, value, true, 'i');
//                        }
//                        html += subHtml;
//                    } else {
//                        html += prettyFun(searchResultObj, mainSpecId, mainObjectSpecs[mainSpecId].name, mainSpecValue, true, 'b');
//                    }
//                    count += 1;
//                }
//            }
//            html += '</div>';
//            element[0].innerHTML = html;
        }
    };
});

/*
 * Directive used to validate catalog metadata form
 */
horaceApp.directive('catalogField', function () {

    function checkRequired(scope, fieldId, fieldValue) {
        var specs = client.shared.workTypeCatalogFieldSpecs[scope.catalog.postData.metadata.workType];
        var valid = true;
        for (var i in specs) {
            var spec = specs[i];
            if (spec.required) {
                var id = specs[i].id;
                var value = (id === fieldId)? fieldValue : scope.catalog.postData.metadata[id];
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
        scope.signin.error = !ok;
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
        var value = (scope.signin.user && scope.signin.user.password);
        var ok = (password && (password === value));
        if (!ok) {
            scope.signin.msg = 'Must confirm password';
        }
        scope.signin.error = !ok;
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
                    var isUsername = (attrs.id === 'username');
                    var isEmail = (attrs.id === 'email');
                    var valid = validate(scope, ctrl, attrs.id, fieldValue, (isUsername ? USERNAME_REGEXP : (isEmail ? EMAIL_REGEXP : PASSWORD_REGEXP)));
                    if (valid === undefined) {
                        var minLength = (isUsername ? 3 : 8);
                        if (isEmail) {
                            scope.signin.msg = 'Email address invalid';
                        } else if (fieldValue && fieldValue.length < minLength) {
                            scope.signin.msg = 'At least ' + minLength + ' characters';
                        } else if (fieldValue && fieldValue.length > 32) {
                            scope.signin.msg = 'No more than 32 characters';
                        } else {
                            scope.signin.msg = 'Get ' + attrs.id + ' help';
                        }
                    }
                    return valid;
                });
        }
    };
});


//horaceApp.directive('placeholder', function ($timeout) {
//    "use strict";
//    return {
//        link: function (scope, elm, attrs) {
//            if (attrs.type === 'password') {
//                return;
//            }
//            $timeout(function () {
//                $(elm).val(attrs.placeholder).focus(function () {
//                    if ($(this).val() === $(this).attr('placeholder')) {
//                        $(this).val('');
//                    }
//                }).blur(function () {
//                        if ($(this).val() === '') {
//                            $(this).val($(this).attr('placeholder'));
//                        }
//                    });
//            });
//        }
//    };
//});