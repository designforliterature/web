/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

// CLIENT SIDE --------------------------------------------------------------------------------------------

'use strict';

/* txSocket: the transactions socket */
var txSocket;

/* noteSocket: the notification socket */
var noteSocket;

/**
 * Creates sockets for use by interested client parties.
 */
horaceApp.service('SocketsService', ['ConfigService', 'NotificationService', function (ConfigService, NotificationService) {

    var onCatalogSearchQueryListener = function (tx) {
        dflGlobals.debug(tx);
    };

    var setCatalogSearchQueryListener = function (listener) {
        onCatalogSearchQueryListener = listener;
    }

    var onCatalogSaveMetadataListener = function(tx) {
        dflGlobals.debug(tx);
    }

    var setCatalogSaveMetadataListener = function (listener) {
        onCatalogSaveMetadataListener = listener;
    }

//    horaceApp.connectSockets();
    var connectSockets = function () {
        txSocket = io.connect('/tx');
        noteSocket = io.connect('/note');

        // Transaction Socket -------------------------------------------------------------------------------------------
        txSocket.on('connection', function (sock) {
            alert('txSocket: Connected');
            sock.on('connecting', function () {
                alert('txSocket: Connecting...');
            });
            sock.on('disconnect', function () {
                console.info('txSocket: Disconnected');
            });
            sock.on('connect_failed', function () {
                console.info('txSocket: Connect failed');
            });
            sock.on('reconnecting', function () {
                console.info('txSocket: Reconnecting...');
            });
            sock.on('reconnect', function () {
                console.info('txSocket: Reconnected');
            });
            sock.on('reconnect_failed', function () {
                console.info('txSocket: Reconnect failed');
            });
            sock.on('error', function () {
                console.info('txSocket: Some socket error');
            });
        });

        /**
         * result of attempt to create or update a catalog item.
         */
        txSocket.on('catalog/submit', function (tx) {
            onCatalogSaveMetadataListener(tx);
        });

        /**
         * catalogTx: result of attempt to search the catalog.
         */
        txSocket.on('catalog/search/query', function (tx) {
            onCatalogSearchQueryListener(tx);
        });


        // Note Socket --------------------------------------------------------------------------------------------------
        /** noteSocket Socket: socket used to communicate notifications from server */

        /* noteTitle: key := the notification type, value := the title to use in the notification */
        var noteTitle = {trans: 'Technical Problem', error: 'Error', warn: 'Warning', ack: 'Note', note: 'Note'};

        /**
         * Returns an appropriate message for the specified notification
         * @param note  The notification object
         * @returns {string} The message text
         */
        noteSocket.makeMessage = function (note) {
            var msg = note.msg;
            if (note.type === 'fatal') {
                msg = 'Our site is currently down for maintenance. Our apologies. Please try again later.';
                console.trace(note);
            } else if (note.type === 'trans') {
                msg = 'Due to a technical problem, your request was not fulfilled. Please try again.';
                console.trace(note);
            }
            return msg;
        };

        /**
         * Returns an appropriate notification icon based on the specified notification type.
         * @param noteType  The notification type.
         * @returns {ConfigService.icon.notification|*}
         */
        noteSocket.getIcon = function (noteType) {
            return ConfigService.icon.notification; // TODO create warning and error icons
        };

        noteSocket.on('connection', function (sock) {
            console.info('noteSocket: Connected');
            sock.on('connecting', function () {
                console.info('noteSocket: Connecting...');
            });
            sock.on('disconnect', function () {
                console.info('noteSocket: Disconnected');
            });
            sock.on('connect_failed', function () {
                console.info('noteSocket: Connect failed');
            });
            sock.on('reconnecting', function () {
                console.info('noteSocket: Reconnecting...');
            });
            sock.on('reconnect', function () {
                console.info('noteSocket: Reconnected');
            });
            sock.on('reconnect_failed', function () {
                console.info('noteSocket: Reconnect failed');
            });
            sock.on('error', function () {
                console.info('noteSocket: Some socket error');
            });
        });

        /**
         * Receives a notification from the server.
         */
        noteSocket.on('note', function (note) {
            if (note && note.type && note.msg) {
                var title = noteTitle[note.type] || 'Unknown Error';
                var msg = noteSocket.makeMessage(note);
                var icon = noteSocket.getIcon(note.type);
                NotificationService.displayNotification(title, msg, icon, 0, undefined);
            } else {
                console.info('BAD SERVER NOTIFICATION: ' + JSON.stringify(note));
            }
        });

        return {

            noteSocket: noteSocket,
            txSocket: txSocket
        }

    };


    return {
        connectSockets: connectSockets,
        setCatalogSearchQueryListener: setCatalogSearchQueryListener,
        setCatalogSaveMetadataListener: setCatalogSaveMetadataListener
    };
}]);