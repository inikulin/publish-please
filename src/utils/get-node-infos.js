'use strict';
const exec = require('cp-sugar').exec;

module.exports = {
    getCurrentNpmVersion,
    getCurrentNodeVersion,
    getCurrentNodeAndNpmVersions,
};

function getCurrentNpmVersion() {
    return exec('npm version --json').then((out) => JSON.parse(out).npm);
}

function getCurrentNodeVersion() {
    return Promise.resolve(process.version);
}

function getCurrentNodeAndNpmVersions() {
    return Promise.all([getCurrentNodeVersion(), getCurrentNpmVersion()]).then(
        (results) => ({ node: results[0], npm: results[1] })
    );
}
