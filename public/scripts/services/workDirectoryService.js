/**
 * Created by rk on 3/14/14.
 */

/**
 * WorkService: returns a function that creates a work's directory.
 * The directory handles the local caching and navigation of the work.
 */
horaceApp.service('WorkDirectoryService', function () {

    function ChunkInfo(id, title, parent, children) {
        this.id = id;
        this.title = title;
        this.parent = parent;
        this.children = children;
        this.content = undefined; // cached data
    }

    function processToc(children, parent, toc, contentCache) {
        if (children && children.length !== 0) {
            for (var i in children) {
                var chunk = children[i],
                    chunkInfo = new ChunkInfo(chunk.id, chunk.title, parent);
                contentCache[chunkInfo.id] = chunkInfo;
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

    function setContent(cache, id, content) {
        var cacheInfo = cache[id];
        if (cacheInfo) {
            cacheInfo.content = content;
        } else {
            console.trace('Missing chunk info for chunk id ' + id); // TODO handle this development error
        }
    }

    function getContent(cache, id) {
        var cacheInfo = cache[id];
        if (!cacheInfo) {
            // TODO fetch it if it hasn't already been found
        }
        callback(null, cacheInfo.content);
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
        setContent(this.contentCache, rootChunk._id, rootChunk.data);

        /* getChunkInfo: returns chunk info for the given chunk id */
        this.getChunkInfo = function (id) {
            return this.contentCache[id];
        };

        /* getChunkContent: returns contents of specified chunk (undefined if there are no contents) */
        this.getChunkContent = function (id, callback) {
            getContent(id, callback);
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

    };

    return {
        makeDirectory: makeDirectory
    };
});