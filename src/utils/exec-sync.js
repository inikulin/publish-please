'use strict';
const exec = require('child_process').execSync;

module.exports = function(command) {
    try {
        const result = exec(command, { encoding: 'utf8' });
        return result.toString();
    } catch (error) {
        return error.message;
    }
};
