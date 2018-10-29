'use strict';

const readPkg = require('../utils/read-package-json').readPkgSync;
const validate = require('../validations').validate;
const confirm = require('../utils/inquires').confirm;
const printReleaseInfo = require('./print-release-info');
const runScript = require('./run-script');
const SCRIPT_TYPE = require('./run-script').SCRIPT_TYPE;
const publish = require('./publish-script');
const getOptions = require('../publish-options').getOptions;
const assertNode6PublishingPrerequisite = require('./publish-prerequisites')
    .assertNode6PublishingPrerequisite;
const executionContext = require('../utils/execution-context');
const showValidationErrors = require('../utils/show-validation-errors');

module.exports = function(opts, projectDir) {
    let pkg = null;

    opts = getOptions(opts, projectDir);

    return assertNode6PublishingPrerequisite()
        .then(
            () =>
                opts.prePublishScript &&
                runScript(opts.prePublishScript, SCRIPT_TYPE.prePublish)
        )
        .then(() => readPkg(projectDir))
        .then((packageContent) => (pkg = packageContent))
        .then(() => validate(opts.validations, pkg))
        .then(() => printReleaseInfo(pkg.version, opts.publishTag))
        .then(
            () =>
                /* eslint-disable indent */
                opts.confirm
                    ? confirm(
                          'Are you sure you want to publish this version to npm?',
                          false
                      )
                    : true
            /* eslint-enable indent */
        )
        .then(
            (ok) => (ok && publish(opts.publishCommand, opts.publishTag)) || ''
        )
        .then((command) => {
            if (!command || !opts.postPublishScript) return command;

            return runScript(
                opts.postPublishScript,
                SCRIPT_TYPE.postPublish
            ).then(() => command);
        })
        .catch((err) => {
            showValidationErrors(err);
            if (executionContext && executionContext.isInTestMode()) {
                return Promise.reject(err);
            }
            process.exit(1);
        });
};
