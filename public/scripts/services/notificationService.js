/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */


/* CLIENT SIDE ------------------------------------------------------------------------------------- */

'use strict';

horaceApp.service('NotificationService', function () {

    var Notification = window.Notification || window.mozNotification || window.webkitNotification || window.msNotification,
        FileReader = window.FileReader || window.mozFileReader || window.webkitFileReader || window.msFileReader;

    /* Is permission to use notifications granted? */
    var granted = false;

    if (!Notification) {
        alert('Sorry, but your browser settings do not support notifications.');
    }

    function setPermissionState (state, callback) {
        granted = state;
        if (callback) {
            callback();
        }
        console.log('Notification permission ' + (granted ? 'granted' : 'not granted'));
    }

    /**
     * Checks whether we are permitted to use the notification system.
     * Sets var granted to true if permission is granted.
     * Will display a notification by calling callback if it is provided.
     */
    var checkPermission = function (callback) {

        if (Notification.permission === 'granted') {
            setPermissionState(true, callback);
        } else {
            try {
                Notification.requestPermission(function (status) {
                    if (status && status === "granted") {
                        setPermissionState(true, callback);
                    }
                });
            } catch (reqErr) {
                console.trace(reqErr);
                alert('Sorry, but your browser settings do not support notifications.');
            }
        }
    };


    var displayNotification = function (title, message, icon, delay, onclick) {
        var instance;

        function doDisplay() {
            if (title.length > 0) {
                var attributes = {lang: 'en'};

                delay = Math.max(0, Math.min(60, delay));

                if (message.length > 0) {
                    attributes.body = message.substr(0, 250);
                }

                if (icon !== undefined && icon.length > 0) {
                    attributes.icon = icon;
                }

                if (delay > 0) {
                    window.setTimeout(function () {

                        instance = new Notification(title.substr(0, 100), attributes);
                        if (onclick !== undefined) {
                            instance.onclick = onclick;
                        }
                    }, delay * 1000);
                } else {
                    instance = new Notification(title.substr(0, 100), attributes);

                    if (onclick !== undefined) {
                        instance.onclick = onclick;
                    }
                }
            }
        }

        if (!granted) {
            checkPermission(doDisplay);
        } else {
            doDisplay();
        }
    };

    return {
        displayNotification: displayNotification
    };
});
