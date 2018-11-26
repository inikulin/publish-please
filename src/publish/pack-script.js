'use strict';

const pathSeparator = require('path').sep;
const spawn = require('cp-sugar').spawn;
const reporter = require('../reporters/current');
const pathJoin = require('path').join;
const unlink = require('fs').unlinkSync;
const readPkg = require('../utils/read-package-json').readPkgSync;
const fileExists = require('fs').existsSync;

module.exports = function pack(projectDir) {
    projectDir = projectDir || process.cwd();
    const pkg = readPkg(projectDir);
    const command = 'npm pack';
    const projectName = projectDir.split(pathSeparator).pop();
    return spawn(command)
        .then(() =>
            reporter
                .current()
                .reportSucceededProcess(
                    `${projectName} is safe to be published.`
                )
        )
        .then(() => {
            const file = pathJoin(projectDir, `${pkg.name}-${pkg.version}.tgz`);
            if (fileExists(file)) {
                unlink(file);
            }
        });
};
