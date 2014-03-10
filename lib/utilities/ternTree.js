/*
 Copyright (c) 2012, Ryan Kaskel
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are
 met:

 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above
 copyright notice, this list of conditions and the following
 disclaimer in the documentation and/or other materials provided
 with the distribution.

 * Neither the name of tritium the names of its
 contributors may be used to endorse or promote products derived
 from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL RYAN KASKEL BE
 LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
 BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN
 IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var ternarySearchTree = function() {
    var root,
        numWords = 0,
        numNodes = 0;

    function insert(node, chars) {
        var firstChar = chars.charAt(0),
            node;

        if (!firstChar) return null;

        if (!node) {
            node = {
                character: firstChar,
                left: null,
                middle: null,
                right: null,
                word: false
            };
            numNodes += 1;
        }

        if (!root) root = node;

        if (firstChar < node.character) {
            node.left = insert(node.left, chars);
        } else if (firstChar === node.character) {
            if (chars.length > 1) {
                node.middle = insert(node.middle, chars.slice(1));
            } else {
                node.word = true;
                numWords += 1;
            }
        } else {
            node.right = insert(node.right, chars);
        }

        return node;
    }

    function search(node, chars) {
        var firstChar = chars.charAt(0),
            rest;

        if (!node || !firstChar) return null;

        if (firstChar < node.character) {
            return search(node.left, chars);
        } else if (firstChar > node.character) {
            return search(node.right, chars);
        } else {
            rest = chars.slice(1);
            if (!rest) {
                return node;
            } else {
                return search(node.middle, rest);
            }
        }

        return null;
    }

    function childWords(node, prefix, limit) {
        var foundWords = [],
            parentNode,
            traversalData = {
                foundWords: foundWords,
                prefix: prefix
            };

        if (!node || !prefix) return foundWords;

        parentNode = search(node, prefix);

        if (!parentNode) return foundWords;

        depthFirstTraversal(parentNode.middle, function(node, data) {
            if (data.foundWords.length >= limit) return null;

            data = {
                foundWords: data.foundWords,
                prefix: data.prefix + node.character
            };

            if (node.word) data.foundWords.push(data.prefix);

            return data;
        }, traversalData);

        return foundWords;
    }

    function depthFirstTraversal(node, visit, data) {
        var modifiedData;

        if (!node || data === null) return;

        if (node.left) depthFirstTraversal(node.left, visit, data);
        modifiedData = visit(node, data);
        if (node.middle) depthFirstTraversal(node.middle, visit, modifiedData);
        if (node.right) depthFirstTraversal(node.right, visit, data);
    }

    return {
        getRoot: function() {
            return root;
        },
        wordCount: function() {
            return numWords;
        },
        nodeCount: function() {
            return numNodes;
        },
        add: function(word) {
            insert(root, word);
        },
        has: function(prefix, isWord) {
            var foundNode = search(root, prefix);
            return foundNode
                ? isWord ? foundNode.word : true
                : false;
        },
        prefixSearch: function(prefix, limit) {
            return childWords(root, prefix, limit);
        },
        traverse: function(visit, data) {
            depthFirstTraversal(root, visit, data);
        }
    }
};

exports.ternarySearchTree = ternarySearchTree;