'use strict';
const node = require('../utils/get-node-infos');

module.exports.assertNode6PublishingPrerequisite = assertNode6PublishingPrerequisite;

// NOTE: adopted from https://github.com/sindresorhus/np/blob/master/index.js#L78
function assertNode6PublishingPrerequisite() {
    return node.getCurrentNodeAndNpmVersions().then((version) => {
        if (version.isNode6 && version.isSafeNpm) {
            return Promise.resolve();
        }
        throw new Error(
            `npm@${
                version.npm
            } has known issues publishing when running Node.js 6. Please upgrade npm or downgrade Node and publish again. See: https://github.com/npm/npm/issues/5082`
        );
    });
}
