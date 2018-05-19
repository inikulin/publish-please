'use strict';

const exec = require('cp-sugar').exec;
const confirm = require('../utils/inquires').confirm;

module.exports = {
    option: 'gitTag',
    statusText: 'Validating git tag',
    defaultParam: true,

    configurator(currentVal) {
        return confirm(
            'Would you like to verify that published commit has git tag that ' +
                'is equal to the version specified in package.json?',
            currentVal
        );
    },

    run(_, pkgInfo) {
        return exec('git describe --exact-match --tags HEAD')
            .catch(() => {
                throw "Latest commit doesn't have git tag.";
            })
            .then((tag) => {
                const version = pkgInfo.cfg.version;

                if (tag !== version && tag !== 'v' + version)
                    throw `Expected git tag to be '${version}' or 'v${version}', but it was '${tag}'.`;
            });
    },
};
