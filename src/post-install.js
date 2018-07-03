'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;

(function postInstall(currentDir) {
    const getNpmArgs = require('./utils/get-npm-args');
    const npmArgs = getNpmArgs(process.env);
    if (npmArgs.npx) {
        return;
    }
    const jsFile = pathJoin(currentDir || __dirname, 'init.js');
    if (fileExists(jsFile)) {
        const initConfiguration = require(jsFile);
        initConfiguration();
    }
})(__dirname);
