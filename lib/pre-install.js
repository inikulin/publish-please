'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;

(function preInstall(currentDir) {
    const jsFile = pathJoin(
        currentDir || __dirname,
        'prevent-global-install.js'
    );
    if (fileExists(jsFile)) {
        const preventGlobalInstall = require(jsFile);
        preventGlobalInstall();
    }
})(__dirname);
