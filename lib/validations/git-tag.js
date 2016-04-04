'use strict';

const exec = require('cp-sugar').exec;

module.exports = {
    option:       'gitTag',
    statusText:   'Validating git tag',
    defaultParam: true,

    run (_, pkgInfo) {
        return exec('git describe --exact-match --tags HEAD')
            .catch(() => {
                throw "Latest commit doesn't have git tag.";
            })
            .then(tag => {
                const version = pkgInfo.cfg.version;

                if (tag !== version && tag !== 'v' + version)
                    throw 'Expected git tag to be `' + version + '` or `v' + version + '`, but it was `' + tag + '`.';
            });
    }
};
