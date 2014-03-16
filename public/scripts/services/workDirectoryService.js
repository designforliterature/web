/**
 * Created by rk on 3/14/14.
 */

/**
 * WorkService: returns a function that creates a work's directory.
 * The directory handles the local caching and navigation of the work.
 */
horaceApp.service('WorkDirectoryService', function ($http) {

    function ChunkInfo(id, dataType, title, parent, children) {
        this.id = id;
        this.dataType = dataType;
        this.title = title;
        this.parent = parent;
        this.children = children;
    }

    function processToc(children, parent, toc, contentCache) {
        if (children && children.length !== 0) {
            var i, chunk, lastChunk, chunkInfo;
            for (i in children) {
                lastChunk = chunkInfo;
                chunk = children[i];
                chunkInfo = new ChunkInfo(chunk.id, chunk.dataType, chunk.title, parent);
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
                processToc(chunk.sections, chunkInfo, toc, contentCache);
            }
        }
    }

    function setToplevelChunkContent(cache, chunk) {
        var cacheInfo = cache[chunk.id];
        if (cacheInfo) {
            if (chunk.data && chunk.data.length !== 0) {
                cacheInfo.content = chunk.data;
                if (chunk.sections && chunk.sections.length !== 0) { // use children instead of sections in store/server
                    for (var i in chunk.sections) {
                        setToplevelChunkContent(cache, chunk.sections[i]);
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
     * makeDirectory: creates a work directory
     * @param rootChunk  The root (first) chunk of a work.
     */
    var makeDirectory = function (rootChunk) {

        if (!rootChunk || !rootChunk.toc) {
            throw 'root chunk missing or without TOC';
        }

        /* cache: caches work contents and related information */
        this.toc = [];
        this.contentCache = {};
        processToc(rootChunk.toc, null, this.toc, this.contentCache);
        setToplevelChunkContent(this.contentCache, rootChunk);

        /**
         * getChunkInfo: returns chunk info (with content--if any) for the given chunk id
         * @param id The chunk id
         * @param callback The callback
         * @returns {*} A ChunkInfo object or null if there's no chunk for the id.
         */
        this.getChunkInfo = function (id, callback) {
            var cache = this.contentCache,
            chunkInfo = cache[id];
            if (chunkInfo && !chunkInfo.content) {
                var rootChunk = getRootChunkInfo(chunkInfo);
                $http.get('/catalog/work/chunk',
                    { params: { id: rootChunk.id}})
                    .success(function (res) {
                        if (res.content) {
                            setToplevelChunkContent(cache, res.content);
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

        /* Returns an array of children of specified chunk (empty array if there are none) */
        this.getChunkChildrenInfo = function (id, chunkInfo) {

        };

        /* Returns parent of specified chunk (null if chunk is the root) */
        this.getChunkParentInfo = function (id, chunkInfo) {

        };

        this.nextChunkInfo = function (level, id, chunkInfo) {

        };

        this.previousChunkInfo = function (level, id, chunkInfo) {

        };

        return this;

    };

    return {
        makeDirectory: makeDirectory
    };
});