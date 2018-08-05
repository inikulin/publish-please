'use strict';

const pathJoin = require('path').join;
const nsp = require('nsp');
const confirm = require('../utils/inquires').confirm;
const Promise = require('pinkie-promise');
const readPkg = require('read-pkg');
const chalk = require('chalk');
const nodeInfos = require('../utils/get-node-infos').getNodeInfosSync();

module.exports = {
    option: 'vulnerableDependencies',
    statusText: 'Checking for the vulnerable dependencies',
    defaultParam: true,

    configurator(currentVal) {
        return confirm(
            "Would you like to verify that your package doesn't have vulnerable dependencies before publishing?",
            currentVal
        );
    },
    canRun() {
        // prettier-ignore
        return nodeInfos && nodeInfos.npmAuditHasJsonReporter
            ? true
            : false;
    },
    whyCannotRun() {
        return `Cannot check vulnerable dependencies because npm version is ${
            nodeInfos.npmVersion
        }. Either upgrade npm to version 6.1.0 or above, or disable this validation in the configuration file`;
    },
    run(_, pkgInfo) {
        return new Promise((resolve, reject) => {
            const projectDir = pathJoin(process.cwd());
            const defaultArgs = nsp.sanitizeParameters({});
            const args = {
                baseUrl: defaultArgs.baseUrl,
                proxy: defaultArgs.proxy,
                reporter: 'summary',
                'warn-only': false,
                path: projectDir,
                // prettier-ignore
                pkg: pkgInfo && pkgInfo.cfg
                    ? pkgInfo.cfg
                    : readPkg.sync(projectDir, {
                        normalize: false,
                    }),
                offline: false,
                exceptions: Array.isArray(defaultArgs.exceptions)
                    ? defaultArgs.exceptions
                    : [],
            };

            nsp
                .check(args)
                .then((result) => {
                    if (vulnerabilitiesFoundIn(result)) {
                        const errs = result.data
                            .map((vulnerability) => summaryOf(vulnerability))
                            .sort();
                        reject(errs);
                        return;
                    }
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
};

function vulnerabilitiesFoundIn(result) {
    return result && result.data && result.data.length > 0;
}

function summaryOf(vulnerability) {
    const vulnerablePackageName = `${vulnerability.module ||
        'undefined'}@${vulnerability.version || '?.?.?'}`;

    // prettier-ignore
    const vulnerablePackagePath =
        vulnerability.path && vulnerability.path.length >= 2
            ? vulnerability.path.slice(1)
            : [];

    // prettier-ignore
    const rootPackageName =
        vulnerablePackagePath.length >= 1
            ? vulnerablePackagePath[0]
            : vulnerablePackageName;

    // prettier-ignore
    const recommendation = vulnerability.recommendation
        ? vulnerability.recommendation.replace('\n', '\n\t')
        : '';

    const vulnerabilityIsDirectDependency =
        vulnerablePackageName === rootPackageName;
    // prettier-ignore
    const summary = vulnerabilityIsDirectDependency
        ? `Vulnerability found in ${elegant(rootPackageName)}\n\t${recommendation}\n\tAdvisory: ${vulnerability.advisory || ''}`
        : `Vulnerability found in ${chalk.bold(rootPackageName)}\n\tinside ${elegant(vulnerablePackagePath)}\n\t${vulnerability.recommendation || ''}\n\tAdvisory: ${vulnerability.advisory || ''}`;
    return summary;
}

function elegant(pathOrName) {
    // prettier-ignore
    return Array.isArray(pathOrName)
        ? elegantPath(pathOrName)
        : elegantName(pathOrName);
}

function elegantPath(path) {
    // prettier-ignore
    const lastIndex = path && path.length
        ? path.length - 1
        : -1;

    // prettier-ignore
    const result = path
        .map((item, index) => {
            return index === lastIndex
                ? chalk.red.bold(item)
                : item;
        })
        .join(' -> ');
    return result;
}

function elegantName(name) {
    return chalk.red.bold(name);
}
