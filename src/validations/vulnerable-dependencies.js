'use strict';

const pathJoin = require('path').join;
const nsp      = require('nsp');
const confirm  = require('../utils/inquires').confirm;
const Promise  = require('pinkie-promise');
const readPkg  = require('read-pkg');

module.exports = {
    option:       'vulnerableDependencies',
    statusText:   'Checking for the vulnerable dependencies',
    defaultParam: true,

    configurator (currentVal) {
        return confirm(
            "Would you like to verify that your package doesn't have vulnerable dependencies before publishing?",
            currentVal
        );
    },

    run () {
        return new Promise((resolve, reject) => {
            const projectDir = pathJoin(process.cwd());
            const defaultArgs = nsp.sanitizeParameters({});
            const args = {
                baseUrl:     defaultArgs.baseUrl,
                proxy:       defaultArgs.proxy,
                reporter:    'summary',
                'warn-only': false,
                path:        projectDir,
                pkg:         readPkg.sync(projectDir, { normalize: false }),
                offline:     false,
                exceptions:  []
            };

            nsp.check(args)
                .then(result => {
                    if (result && result.data && result.data.length === 0) {
                        resolve();
                        return;
                    }
                    if (result && result.data && result.data.length > 0) {
                        const err = result.data
                                .map( item => `vulnerability found in ${item.module || 'undefined'}@${item.version || '?.?.?'}. ${item.recommendation || ''} Advisory: ${item.advisory || ''}`);
                        reject(err);
                        return;
                    }
                    resolve(result);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }
};
