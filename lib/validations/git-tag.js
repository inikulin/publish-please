'use strict';

var exec = require('cp-sugar').exec;
var confirm = require('../utils/inquires').confirm;

module.exports = {
    option: 'gitTag',
    statusText: 'Validating git tag',
    defaultParam: true,

    configurator: function configurator(currentVal) {
        return confirm('Would you like to verify that published commit has git tag that ' + 'is equal to the version specified in package.json?', currentVal);
    },
    run: function run(_, pkgInfo) {
        return exec('git describe --exact-match --tags HEAD').catch(function () {
            throw "Latest commit doesn't have git tag.";
        }).then(function (tag) {
            var version = pkgInfo.cfg.version;

            if (tag !== version && tag !== 'v' + version) throw 'Expected git tag to be `' + version + '` or `v' + version + '`, but it was `' + tag + '`.';
        });
    }
};