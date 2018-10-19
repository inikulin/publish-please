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
        // prettier-ignore
        return nodeInfos && nodeInfos.npmPackHasJsonReporter
            ? true
            : false;
    },
    whyCannotRun() {
        return `Cannot check sensitive and non-essential data because npm version is ${
            nodeInfos.npmVersion
        }. Either upgrade npm to version 5.9.0 or above, or disable this validation in the configuration file`;
    },
    run() {
        return new Promise((resolve, reject) => {
            try {
                const projectDir = process.cwd();
                auditPackage(projectDir)
                    .then((result) => {
                        if (sensitivaDataFoundIn(result)) {
                            const errs = [];
                            result.files
                                .filter((file) => file && file.isSensitiveData)
                                .forEach((file) => {
                                    errs.push(summaryOf(file.path));
                                });
                            reject(errs.sort());
                            return;
                        }
                        if (auditErrorFoundIn(result)) {
                            reject(summaryErrorOf(result.error));
                            return;
                        }
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error.message);
            }
        });
    },
};

function sensitivaDataFoundIn(result) {
    return Array.isArray(result.files)
        ? result.files.filter((file) => file && file.isSensitiveData).length > 0
        : false;
}

function summaryOf(sensitiveData) {
    const summary = `Sensitive or non essential data found in npm package: ${sensitiveData}`;
    return summary;
}

function auditErrorFoundIn(result) {
    return result && result.error && result.error.summary;
}

function summaryErrorOf(error) {
    const summary = elegantSummary(error.summary);
    return summary;
}

function elegantSummary(summary) {
    const result = summary
        .split('\n')
        .map((line, index) => (index === 0 ? line : `\t${line}`))
        .join('\n');
    return result;
}
