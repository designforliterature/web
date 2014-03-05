#!/bin/bash

# Starts the database

# This assumes that your PATH will access the mongodb command
# and that you have created the database directory /data/db (you can
# create it anywhere you want as long as you change the corresponding command
# line parameter below.

mongod --port 21191 --dbpath /data/db --setParameter textSearchEnabled=true &

# When starting the DB for the first time, initialize indexes as follows (ommit
# the double-quotes around the commands):
# 1. Enter the mongo db Javascript shell: "mongo --port 21191"
# 2. Enter "use works"
# 3. Copy and paste into the shell the script in the contents of file scripts/init-db.js.
# 4. Exit the shell.

# To stop the DB, kill the mongod process (ps -ef | grep mongod).
