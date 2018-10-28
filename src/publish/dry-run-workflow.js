'use strict';

const readPkg = require('../utils/read-package-json').readPkgSync;
const chalk = require('chalk');
const validate = require('../validations').validate;
const confirm = require('../utils/inquires').confirm;
const printReleaseInfo = require('./print-release-info');
const runScript = require('./run-script');
const publish = require('./publish-script');
const SCRIPT_TYPE = require('./run-script').SCRIPT_TYPE;
const getOptions = require('../publish-options').getOptions;
const assertNode6PublishingPrerequisite = require('./publish-prerequisites')
    .assertNode6PublishingPrerequisite;
const executionContext = require('../utils/execution-context');
const showValidationErrors = require('../utils/show-validation-errors');

const ADVISORY_MESSAGE = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! run 'npm pack' to have more details on the package !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function reportAdvisory() {
    console.log(chalk.bgGreen(ADVISORY_MESSAGE));
}

module.exports = function(opts, projectDir) {
    let pkg = null;

    opts = getOptions(opts, projectDir);

    return assertNode6PublishingPrerequisite()
        .then(() => console.log(chalk.green.bold('dry mode activated')))
        .then(() => console.log(''))
        .then(
            () =>
                opts.prePublishScript &&
                runScript(opts.prePublishScript, SCRIPT_TYPE.prePublish)
        )
        .then(() => readPkg(projectDir))
        .then((pkgContent) => (pkg = pkgContent))
        .then(() => validate(opts.validations, pkg))
        .then(() => printReleaseInfo(pkg.version, opts.publishTag))
        .then(
            () =>
                /* eslint-disable indent */
                opts.confirm
                    ? confirm(
                          'Are you sure you want to publish this version to npm?\n(you are in dry mode: you will only see the package content. Nothing is sent to npm)',
                          true
                      )
                    : true
            /* eslint-enable indent */
        )
        .then((ok) => ok && publish('npm pack').then(() => reportAdvisory()))
        .catch((err) => {
            showValidationErrors(err);
            if (executionContext && executionContext.isInTestMode()) {
                return Promise.reject(err);
            }
            process.exit(1);
        });
};
