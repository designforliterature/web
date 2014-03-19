/**
 * Created by rk on 3/14/14.
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
                chunkInfo = new ChunkInfo(chunk.id, chunk.dataType, chunk.title, parent, (parseInt(index, 10) + 1), siblingCount);
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
        this.rootChunk = rootChunk;
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

        this.getSectionCount = function () {
            return this.rootChunk.toc.length;
        };
        return this;
    };

    return {
        makeDirectory: makeDirectory
    };
});