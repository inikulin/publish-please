const { closeSync, openSync } = require('fs');

module.exports = (filename) => closeSync(openSync(filename, 'w'));
