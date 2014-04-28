#!/bin/bash

# Starts the MongoDB database

# This assumes that your PATH will access the mongodb command
# and that you have created the database directory /data/db (you can
# create it anywhere you want as long as you change the corresponding command
# line parameter below.

mongod --port 21191 --dbpath /data/db &

# To stop the DB, kill the mongod process (ps -ef | grep mongod).

# When starting the DB for the first time, initialize indexes:
# mongo --port 21191 init-db.js




