/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2013 Ruben Kleiman
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *and associated documentation files (the "Software"), to deal in the Software without restriction,
 *including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 *subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all copies or
 *substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 *THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Controls the search behavior
 */

horaceApp.controller('SearchCtrl', function ($scope, $http, SocketsService, $timeout, $upload, $state) {

    var defaultNotify = false;

    $scope.search = {

        /* query: catalog search query fields TODO must conform to server-side schema.query! */
        query: {
            general: null, /* general: queries any metadata and content */
            notify: defaultNotify /* eventually part of user prefs */
        },

        searchResults: undefined,

        search: function (event) {
            var query = $scope.search.query;
            if ((typeof query === 'undefined') || (typeof event !== 'undefined' && event.keyCode !== 13)) {
                return;
            }
            $scope.search.searchResults = [];
            var searchMsg = $('#toplevelSearchMsg')[0];
            searchMsg.innerHTML = '';
            $('#toplevelSearchResults').css('display', 'inline');
            $http.post('/catalog/search/query', query)
                .success(function (res, status, headers, config) {
                    if (status === 200) {
                        horaceApp.debug(res);
                        if (typeof res.data === 'undefined' || res.data.length === 0) {
                            searchMsg.innerHTML = res.msg;
                        } else {
                            $scope.search.searchResults = res.data;
                        }
                    } else {
                        // TODO clean up
                        $scope.search.searchErrorMsg = 'Error: Try again. (' + res.error + ')';
                        $scope.search.searchError = true;
                    }
                })
                .error(function (err, status, headers, config) { // TODO should be either 400 or 500 page
                    if (status !== 200) {
                        horaceApp.debug(err);
                    }
                    // TODO clean up
                    $scope.search.searchErrorMsg = 'Technical Problem: Please retry. (' + err + ')';
                    $scope.search.searchError = true;
                });
        }

//        printSearchResult: function (searchResultObj, element, attrs) {
//            var fieldSpecs = client.shared.catalogFieldSpecs,
//                citationOrder = fieldSpecs.workType.specs[searchResultObj.workType].citationOrder,
//                fieldName, fieldValue, haveAuthors = false,
//                html = '<div style="margin-top: .5em">';
//            for (var i in citationOrder) {
//                fieldName = citationOrder[i];
//                fieldValue = searchResultObj[fieldName];
//                if (fieldValue) {
//                    switch (fieldName) {
//                        case fieldIds.authors:
//                            for (var j in fieldValue.data) {
//                                var author = fieldValue.data[j];
//                                if (j > 0) {
//                                    html += ' and ';
//                                }
//                                html += '<a class="citation" href="' + author[fieldSpecs.id.id] + '">' + author.fullName + '</a>';
//                            }
//                            html += ', ';
//                            haveAuthors = true;
//                            break;
//                        case fieldIds.editors:
//                            if (haveAuthors) {
//                                html += '[';
//                            }
//                            var count = fieldValue.data.length;
//                            for (var j in fieldValue.data) {
//                                var editor = fieldValue.data[j];
//                                if (j > 0) {
//                                    html += ' and ';
//                                }
//                                html += '<a class="citation" href="' + editor[fieldSpecs.id.id] + '">' + editor.fullName + '</a>';
//                            }
//                            html += ((count === 1) ? ' ed.' : ' eds.') + (haveAuthors ? ']' : '');
//                            break;
//                        case fieldIds.lang:
//                            html += ' [in ' + isoLangs[fieldValue].name + ']';
//                            break;
//                        case fieldIds.publisher:
//                            html += makePublisherHTML(fieldValue, searchResultObj);
//                            break;
//                        case fieldIds.title:
//                            html += '<a class="citation" onclick="clientApp.sendIt(&quot;' + searchResultObj[fieldSpecs.id.id] + '&quot;)"><i> ' + fieldValue + '</i></a> ';
//                            break;
//                        case fieldIds.workType:
//                            break;
//                    }
//                }
//            }
//            element[0].innerHTML = html + '</div>';
//        }
    };
});