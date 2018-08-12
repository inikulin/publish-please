'use strict';

const writeFileSync = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const copyFileSync = require('fs').copyFileSync;

module.exports = function copy(src, dest) {
    if (typeof copyFileSync === 'function') {
        copyFileSync(src, dest);
        console.log('copy file using copyFileSync');
        return;
    }
    console.log('copy file using writeFileSync');
    console.log(`reading source file: ${src}`);
    console.log(`source file content: ${readFileSync(src)}`);
    writeFileSync(dest, readFileSync(src));
};
