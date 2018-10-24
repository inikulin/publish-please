'use strict';

const confirm = require('../utils/inquires').confirm;
const inputList = require('../utils/inquires').inputList;
const Promise = require('pinkie-promise');
const nodeInfos = require('../utils/get-node-infos').getNodeInfosSync();
const auditPackage = require('../utils/npm-audit-package');

module.exports = {
    option: 'sensitiveData',
    statusText:
        'Checking for the sensitive and non-essential data in the npm package',
    defaultParam: true,
    /* eslint-disable indent */
    configurator(currentVal) {
        function configureIgnores() {
            const ignore = Array.isArray(currentVal.ignore)
                ? currentVal.ignore
                : [];

            return confirm(
                'Is there any files that you want to exclude from check?',
                false
            )
                .then(
                    (yes) =>
                        yes
                            ? inputList(
                                  'List files you want to exclude (comma-separated, you can use glob patterns)',
                                  ignore
                              )
                            : true
                )
                .then(
                    (answer) =>
                        Array.isArray(answer) ? { ignore: answer } : answer
                );
        }
        /* eslint-enable indent */

        return confirm(
            'Would you like to verify that there is no sensitive and non-essential data in the npm package?',
            !!currentVal
        ).then((yes) => (yes ? configureIgnores() : false));
    },
    canRun() {
        return nodeInfos && nodeInfos.npmPackHasJsonReporter;
    },
    whyCannotRun() {
        return `Cannot check sensitive and non-essential data because npm version is ${
            nodeInfos.npmVersion
        }. Either upgrade npm to version 5.9.0 or above, or disable this validation in the configuration file`;
    },
    run() {
        return Promise.resolve()
            .then(() => process.cwd())
            .then((projectDir) => auditPackage(projectDir))
            .then((result) => {
                if (sensitivaDataFoundIn(result)) {
                    const errs = result.files
                        .filter((file) => file && file.isSensitiveData)
                        .map((file) => summaryOf(file.path))
                        .sort();
                    throw errs;
                }
            });
    },
};

function sensitivaDataFoundIn(result) {
    return result && Array.isArray(result.files)
        ? result.files.filter((file) => file && file.isSensitiveData).length > 0
        : false;
}

function summaryOf(sensitiveData) {
    return `Sensitive or non essential data found in npm package: ${sensitiveData}`;
}
