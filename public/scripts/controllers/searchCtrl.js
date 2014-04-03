/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

/**
 * Controls the search behavior
 */

horaceApp.controller('SearchCtrl', function ($scope, $http) {

    $scope.search = {

        menubarCtrlScope: $scope.$parent.menubar,

        /* query: catalog search query fields TODO must conform to server-side schema.query! */
        query: {
            general: null, /* general: queries any metadata and content */
            notify: dflGlobals.defaultNotify /* eventually part of user prefs */
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
                        dflGlobals.debug(res);
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
                        dflGlobals.debug(err);
                    }
                    // TODO clean up
                    $scope.search.searchErrorMsg = 'Technical Problem: Please retry. (' + err + ')';
                    $scope.search.searchError = true;
                });
        }
    };
});