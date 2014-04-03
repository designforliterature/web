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

/**
 * Provides client configuration data.
 */
horaceApp.service('ConfigService', function () {

    return {

        /* notificationSocketPath: Used to get push notifications from server */
        notificationSocketPath: '/note',

        /* txSocketPath: Used for client/server transactions */
        txSocketPath: '/tx',

        icon: {
            notification: '/images/dfl-icon-250.png'
        }
    };
});

