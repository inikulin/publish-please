'use strict';

const exec = require('../cp').exec;

module.exports = {
    option:      'validateGitTag',
    spinnerText: 'Validating git tag',

    run (_, pkgInfo) {
        return exec('git describe --exact-match --tags HEAD')
            .catch(() => {
                throw "Latest commit doesn't have git tag.";
            })
            .then(tag => {
                if (tag !== pkgInfo.version && tag !== 'v' + pkgInfo.version) {
                    throw 'Expected git tag to be `' + pkgInfo.version + '` or `v' +
                          pkgInfo.version + '`, but it was `' + tag + '`.';
                }
            });
    }
};
