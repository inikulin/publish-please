'use strict';
const node = require('../utils/get-node-infos');

module.exports.assertNode6PublishingPrerequisite = assertNode6PublishingPrerequisite;

// NOTE: adopted from https://github.com/sindresorhus/np/blob/master/index.js#L78
function assertNode6PublishingPrerequisite() {
    return node.getNodeInfos().then((nodeInfos) => {
        if (nodeInfos.isAtLeastNode6 && nodeInfos.isSafeNpm) {
            return Promise.resolve();
        }
        throw new Error(
            `npm@${
                nodeInfos.npmVersion
            } has known issues publishing when running Node.js 6. Please upgrade npm or downgrade Node and publish again. See: https://github.com/npm/npm/issues/5082`
        );
    });
}
