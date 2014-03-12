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


// CLIENT SIDE --------------------------------------------------------------------------------------------

'use strict';

/**
 * The work content service provides caching and paging
 * of content.
 */
horaceApp.service('WorkContentService', [ '$http', function () {


    var store = { //TODO store should be an LRU cache https://github.com/isaacs/node-lru-cache
        },
        limitKBytes = 100;

    /**
     * Fetches data from server
     * @param type  The type
     * @param name  The name
     */
    function fetch(workId, type, name, callback) {
        $http.get('works/chunk', {
            params: {
                workId: workId,
                type: type,
                name: name,
                limit: limitKBytes
            }
        })
            .success(function (res, status, headers, config) {
            })
            .error(function (res, status, headers, config) {
            });
    }

    function fetchCallback(error, data) {

    }

    return {
        getNext: function (workId, type) {


        },
        getPrevious: function (workId, type) {

        },
        getStart: function (workId, type, name) {
            var workCache = store[workId];
            if (workCache) {
                var typeCache = workCache[type];
                if (typeCache) {
                    var nameCache = typeCache[name];
                    if (nameCache) {
                        if (Array.isArray(nameCache)) {
                            alert('deal with multiple names: ask user');
                        } else {

                        }
                    } else {
                        fetch(workId, type, name);
                    }
                } else {
                    fetch(workId, type, name);
                }
            } else {
                fetch(workId, type, name);
            }
        }
    };
}]);