'use strict';
const semver = require('semver');
const node = require('../utils/get-node-infos');

module.exports.assertNode6PublishingPrerequisite = assertNode6PublishingPrerequisite;

// NOTE: adopted from https://github.com/sindresorhus/np/blob/master/index.js#L78
function assertNode6PublishingPrerequisite() {
    return node.getCurrentNodeAndNpmVersions().then((versions) => {
        const isNode6 = semver.gte(versions.node, '6.0.0');
        const isSafeNpmVersion = semver.satisfies(
            versions.npm,
            '>=2.15.8 <3.0.0 || >=3.10.1'
        );
        if (isNode6 && isSafeNpmVersion) {
            return Promise.resolve();
        }
        throw new Error(
            `npm@${
                versions.npm
            } has known issues publishing when running Node.js 6. Please upgrade npm or downgrade Node and publish again. See: https://github.com/npm/npm/issues/5082`
        );
    });
}
