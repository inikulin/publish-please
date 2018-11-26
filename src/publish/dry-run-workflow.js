'use strict';

const readPkg = require('../utils/read-package-json').readPkgSync;
const validate = require('../validations').validate;
const printReleaseInfo = require('./print-release-info');
const runScript = require('./run-script');
const pack = require('./pack-script');
const SCRIPT_TYPE = require('./run-script').SCRIPT_TYPE;
const getOptions = require('../publish-options').getOptions;
const assertNode6PublishingPrerequisite = require('./publish-prerequisites')
    .assertNode6PublishingPrerequisite;
const showValidationErrors = require('../utils/show-validation-errors');
const reporter = require('../reporters/current');

module.exports = function(opts, projectDir) {
    let pkg = null;
    opts = getOptions(opts, projectDir);

    return assertNode6PublishingPrerequisite()
        .then(() =>
            reporter.current().reportRunningSequence('dry mode activated')
        )
        .then(() => reporter.current().reportAsIs(''))
        .then(
            () =>
                opts.prePublishScript &&
                runScript(opts.prePublishScript, SCRIPT_TYPE.prePublish)
        )
        .then(() => readPkg(projectDir))
        .then((pkgContent) => (pkg = pkgContent))
        .then(() => validate(opts.validations, pkg))
        .then(() => printReleaseInfo(pkg.version, opts.publishTag))
        .then(() => pack(projectDir))
        .catch((err) => {
            showValidationErrors(err);
            process.exit(1);
        });
};
