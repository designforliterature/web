/*
 * Copyright (c) 2014 Ruben Kleiman under Creative Commons Attribution-ShareAlike 4.0 International License.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter
 * to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 *
 */

/**
 * WorkService: returns a function that creates a work's directory.
 * The directory handles the local caching and navigation of the work.
 */
horaceApp.service('WorkDirectoryService', function ($http) {

    /**
     * A chunk information record.
     * @param id    The chunk id
     * @param dataType  The type of chunk (e.g., Poem)
     * @param title The chunk's title
     * @param parent    The chunk's parent or null if it has none
     * @param index    The chunk's 1-origin index (this is an index of the chunk amongst its siblings)
     * @param siblingCount Number of siblings
     * @constructor
     */
    function ChunkInfo(id, dataType, title, parent, index, siblingCount) {
        this.id = id;
        this.maxSid = undefined;
        this.index = index;
        this.dataType = dataType;
        this.title = title;
        this.parent = parent;
        this.siblingCount = siblingCount;
        this.children = undefined;
        this.content = undefined; /* Content array */

        this.getContentArray = function () {
            return this.content;
        };

        /**
         * Sets the specified content array for this chunk info.
         * @param contentArray   A content array
         */
        this.setContentArray = function (contentArray) {
            this.content = contentArray;
        };
    }

    /**
     * Builds the table of contents. Greedily creates chunk info objects,
     * caches them, and relates them in a chunk hierarchy (i.e., the TOC).
     * @param children  The children of the parent chunk
     * @param parent    The parent chunk
     * @param toc   The table of contents object
     * @param chunkInfoCache    The chunk info object cache
     */
    function buildTOC(children, parent, toc, chunkInfoCache) {
        if (children && children.length !== 0) {
            var index, chunk, lastChunk, chunkInfo, siblingCount = children.length;
            for (index in children) {
                lastChunk = chunkInfo;
                chunk = children[index];
                chunkInfo = new ChunkInfo(chunk.id, chunk.dataType, chunk.title, parent, (parseInt(index, 10) + 1), siblingCount);
                if (lastChunk) {
                    chunkInfo.prevSib = lastChunk;
                    lastChunk.nextSib = chunkInfo;
                }
                chunkInfoCache.set(chunkInfo); // set entry
                if (!parent) {
                    toc.push(chunkInfo);
                } else {
                    if (!parent.children) {
                        parent.children = [chunkInfo];
                    } else {
                        parent.children.push(chunkInfo);
                    }
                }
                buildTOC(chunk.children, chunkInfo, toc, chunkInfoCache);
            }
        }
    }

    /**
     * Sets the root chunk (and all of its subchunks) of a work.
     * @param chunkInfoCache    The chunk info cache
     * @param chunk The root chunk (or subchunk in a recursive call)
     */
    function setRootChunk(chunkInfoCache, chunk) {
        console.info('setting contents for ' + chunk.title + ' chunk id ' + chunk.id);
        var chunkInfo = chunkInfoCache.get(chunk.id);
        if (chunkInfo) {
            chunkInfo.maxSid = chunk.maxSid || 0;
            chunkInfo.notes = chunk.notes || {};
            if (chunk.data && chunk.data.length !== 0) {
                chunkInfo.setContentArray(chunk.data);
                if (chunk.children && chunk.children.length !== 0) {
                    for (var i in chunk.children) {
                        setRootChunk(chunkInfoCache, chunk.children[i]);
                    }
                }
            }
        } else { // TODO handle this development error or cache miss when it's a real cache
            console.trace('Missing chunk info for chunk id ' + chunk.i);
        }
    }

    /**
     * Returns the root chunk for the specified chunk info
     * @param chunkInfo A chunk info
     * @returns {*} The chunk root
     */
    function getRootChunkInfo(chunkInfo) {
        return chunkInfo.parent ? getRootChunkInfo(chunkInfo.parent) : chunkInfo;
    }

    /**
     * Caches chunk info objects.
     * TODO replace with real cache
     * TODO: add cache item expiration policy (default every minute? user preference settable between 1 minute to 1 hour)
     * @constructor
     */
    var ChunkInfoCache = function () {
        this.cache = {};

        /**
         * @param chunkId The chunk id
         * @returns {ChunkInfo} Returns chunk info object with the specified id or null if there isn't one
         */
        this.get = function (chunkId) {
            return this.cache[chunkId];
        };

        /**
         * Caches the chunk info object.
         * @param chunkInfo The chunk info object.
         */
        this.set = function (chunkInfo) {
            this.cache[chunkInfo.id] = chunkInfo;
        };

        /**
         * Removes the chunk info object with the specified id.
         * @param chunkId   The chunk id.
         */
        this.remove = function (chunkId) {
            delete this.cache[chunkId];
        };
    };

    /**
     * Directory: constructor for a work directory.
     * The directory contains the TOC and caches the work during the session.
     * TODO: experiment with making this the model for presentation layer (might be a bit complicated maintenance-wise
     *       to combine cache and ng triggers)
     * @param rootChunk  The root (first) chunk of a work. TODO this has the TOC, but we might want to factor it out of the first chunk.
     */
    var Directory = function (rootChunk) {

        if (!rootChunk || !rootChunk.toc) {
            throw 'root chunk missing or without TOC';
        }

        // The table of contents contains a hierarchy of chunk info objects
        this.toc = [];

        // The chunk info cache
        this.chunkInfoCache = new ChunkInfoCache();

        // The root chunk
        this.rootChunk = rootChunk;

        buildTOC(rootChunk.toc, null, this.toc, this.chunkInfoCache);

        /**
         * getChunkInfo: returns chunk info (with content--if any) for the given chunk id
         * @param id The chunk id
         * @param callback The callback
         * @returns {*} A ChunkInfo object or null if there's no chunk for the id.
         */
        this.getChunkInfo = function (id, callback) {
            var chunkInfoCache = this.chunkInfoCache, // dynamic scope
                chunkInfo = chunkInfoCache.get(id);
            if (chunkInfo && !chunkInfo.getContentArray()) { // TODO when real cache, new case should handle expiration (e.g., no chunkInfo)
                // Get the root chunk for the work (contains the TOC and first chunk's contents + possible subchunks)
                var rootChunkInfo = getRootChunkInfo(chunkInfo);
                $http.get('/catalog/work/chunk',
                    { params: { id: rootChunkInfo.id}})
                    .success(function (res) {
                        if (res.chunk) {
                            setRootChunk(chunkInfoCache, res.chunk);
                        }
                        callback(null, chunkInfo);
                    })
                    .error(function (error) {
                        callback(error);
                    });
            } else {
                callback(null, chunkInfo);
            }
        };

        /**
         * @returns {number} Returns number of root children in the table of contents.
         */
        this.getRootChunksCount = function () {
            return this.rootChunk.toc.length;
        };

        return this;
    };

    return {
        Directory: Directory
    };
});