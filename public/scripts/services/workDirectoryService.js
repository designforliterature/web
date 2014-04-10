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
     * @param maxSid    Maximum selection id
     * @param dataType  The type of chunk (e.g., Poem)
     * @param title The chunk's title
     * @param parent    The chunk's parent or null if it has none
     * @param index    The chunk's 1-origin index (this is an index of the chunk amongst its siblings)
     * @param siblingCount Number of siblings
     * @constructor
     */
    function ChunkInfo(id, maxSid, dataType, title, parent, index, siblingCount) {
        this.id = id;
        this.maxSid = maxSid;
        this.index = index;
        this.dataType = dataType;
        this.title = title;
        this.parent = parent;
        this.siblingCount = siblingCount;
        this.children = undefined;
    }

    function processToc(children, parent, toc, contentCache) {
        if (children && children.length !== 0) {
            var index, chunk, lastChunk, chunkInfo, siblingCount = children.length;
            for (index in children) {
                lastChunk = chunkInfo;
                chunk = children[index];
                chunkInfo = new ChunkInfo(chunk.id, (chunk.maxSid || 0), chunk.dataType, chunk.title, parent, (parseInt(index, 10) + 1), siblingCount);
                if (lastChunk) {
                    chunkInfo.prevSib = lastChunk;
                    lastChunk.nextSib = chunkInfo;
                }
                contentCache[chunkInfo.id] = chunkInfo; // make an entry
                if (!parent) {
                    toc.push(chunkInfo);
                } else {
                    if (!parent.children) {
                        parent.children = [chunkInfo];
                    } else {
                        parent.children.push(chunkInfo);
                    }
                }
                processToc(chunk.children, chunkInfo, toc, contentCache);
            }
        }
    }

    function setToplevelChunkContent(cache, chunk) {
        var cacheInfo = cache[chunk.id];
        if (cacheInfo) {
            if (chunk.data && chunk.data.length !== 0) {
                cacheInfo.content = chunk.data;
                if (chunk.children && chunk.children.length !== 0) { // use children instead of children in store/server
                    for (var i in chunk.children) {
                        setToplevelChunkContent(cache, chunk.children[i]);
                    }
                }
            }
        } else {
            console.trace('Missing chunk info for chunk id ' + id); // TODO handle this development error
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
     * Directory: constructor for a work directory.
     * The directory caches the work during the session.
     * TODO: add cache item expiration policy (default every minute? user preference settable between 1 minute to 1 hour)
     * TODO: experiment with making this the model for presentation layer (might be a bit complicated maintenance-wise
     *       to combine cache and ng triggers)
     * @param rootChunk  The root (first) chunk of a work.
     */
    var Directory = function (rootChunk) {

        if (!rootChunk || !rootChunk.toc) {
            throw 'root chunk missing or without TOC';
        }

        this.toc = [];
        this.contentCache = {}; // TODO replace with real cache or use memcached server or the like
        this.rootChunk = rootChunk;

        // Fill up the cache
        processToc(rootChunk.toc, null, this.toc, this.contentCache);

        setToplevelChunkContent(this.contentCache, rootChunk);

        /**
         * getChunkInfo: returns chunk info (with content--if any) for the given chunk id
         * @param id The chunk id
         * @param callback The callback
         * @returns {*} A ChunkInfo object or null if there's no chunk for the id.
         */
        this.getChunkInfo = function (id, callback) {
            var contentCache = this.contentCache, // dynamic scope
                chunkInfo = contentCache[id];
            if (chunkInfo && !chunkInfo.content) { // TODO when real cache, new case should handle expiration (e.g., no chunkInfo)
                var rootChunkInfo = getRootChunkInfo(chunkInfo);
                $http.get('/catalog/work/chunk',
                    { params: { id: rootChunkInfo.id}})
                    .success(function (res) {
                        if (res.content) {
                            setToplevelChunkContent(contentCache, res.content);
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

        this.getRootChildrenCount = function () {
            return this.rootChunk.toc.length;
        };
        return this;
    };

    return {
        Directory: Directory
    };
});