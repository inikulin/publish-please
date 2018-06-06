'use strict';

const writeFileSync = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const copyFileSync = require('fs').copyFileSync;

module.exports = function copy(src, dest) {
    if (typeof copyFileSync === 'function') {
        copyFileSync(src, dest);
        return;
    }
    writeFileSync(dest, readFileSync(src));
};
