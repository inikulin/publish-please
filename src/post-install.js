'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;

(function postInstall(currentDir) {
    const jsFile = pathJoin(currentDir || __dirname, 'init.js');
    if (fileExists(jsFile)) {
        const initConfiguration = require(jsFile);
        initConfiguration();
    }
})(__dirname);
