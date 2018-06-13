'use strict';
const exec = require('cp-sugar').exec;
const semver = require('semver');

module.exports.assertNode6PublishingPrerequisite = assertNode6PublishingPrerequisite;

// NOTE: adopted from https://github.com/sindresorhus/np/blob/master/index.js#L78
function assertNode6PublishingPrerequisite() {
    return exec('npm version --json').then((out) => {
        const npmVersion = JSON.parse(out).npm;
        const isNode6 = semver.gte(process.version, '6.0.0');
        const isSafeNpmVersion = semver.satisfies(
            npmVersion,
            '>=2.15.8 <3.0.0 || >=3.10.1'
        );

        if (isNode6 && !isSafeNpmVersion)
            throw new Error(
                `npm@${npmVersion} has known issues publishing when running Node.js 6. Please upgrade npm or downgrade Node and publish again. See: https://github.com/npm/npm/issues/5082`
            );
    });
}
