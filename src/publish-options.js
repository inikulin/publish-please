'use strict';
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;
const defaults = require('lodash/defaultsDeep');
const DEFAULT_OPTIONS = require('./default-options');

module.exports.getOptions = getOptions;

function getOptions(opts, projectDir) {
    let rcFileContent = null;
    let rcOpts = {};

    try {
        projectDir = projectDir ? projectDir : process.cwd();
        const publishrcFilePath = pathJoin(projectDir, '.publishrc');
        rcFileContent = readFile(publishrcFilePath).toString();
    } catch (err) {
        // NOTE: we don't have .publishrc file, just ignore the error
    }

    if (rcFileContent) {
        try {
            rcOpts = JSON.parse(rcFileContent);
        } catch (err) {
            throw new Error('.publishrc is not a valid JSON file.');
        }

        opts = defaults({}, opts, rcOpts);
    }

    return defaults({}, opts, DEFAULT_OPTIONS);
}
