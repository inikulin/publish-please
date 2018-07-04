'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;

function isNpxInstall() {
    try {
        const getNpmArgs = require('./utils/get-npm-args');
        const npmArgs = getNpmArgs(process.env);
        return npmArgs.npx ? true : false;
    } catch (error) {
        return false;
    }
}

(function postInstall(currentDir) {
    if (isNpxInstall()) {
        return;
    }

    const jsFile = pathJoin(currentDir || __dirname, 'init.js');
    if (fileExists(jsFile)) {
        const initConfiguration = require(jsFile);
        initConfiguration();
    }
})(__dirname);
