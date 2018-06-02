'use strict';

const fileExists = require('fs').existsSync;
const pathJoin = require('path').join;

(function preInstall(projectDir) {
    const jsFile = pathJoin(
        projectDir || process.cwd(),
        'lib/prevent-global-install.js'
    );
    console.log(jsFile);
    if (fileExists(jsFile)) {
        require(jsFile);
    }
})();
