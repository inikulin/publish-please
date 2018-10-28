'use strict';
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;

module.exports.readPkgSync = readPkgSync;

function readPkgSync(projectDir) {
    let packageFileContent;
    try {
        projectDir = projectDir || process.cwd();
        const packageJsonFilePath = pathJoin(projectDir, 'package.json');
        packageFileContent = readFile(packageJsonFilePath).toString();
    } catch (err) {
        throw new Error("package.json file doesn't exist.");
    }

    try {
        return JSON.parse(packageFileContent);
    } catch (err) {
        throw new Error('package.json is not a valid JSON file.');
    }
}
