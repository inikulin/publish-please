'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;
const getNpmArgs = require('./utils/get-npm-args');
const npmArgs = getNpmArgs(process.env);

(function postInstall(currentDir) {
    if (npmArgs.npx) {
        return;
    }
    const jsFile = pathJoin(currentDir || __dirname, 'init.js');
    if (fileExists(jsFile)) {
        const initConfiguration = require(jsFile);
        initConfiguration();
    }
})(__dirname);
