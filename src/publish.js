'use strict';

const semver = require('semver');
const pkgd = require('pkgd');
const exec = require('cp-sugar').exec;
const validate = require('./validations').validate;
const confirm = require('./utils/inquires').confirm;
const printReleaseInfo = require('./publish/print-release-info');
const runScript = require('./publish/run-script');
const SCRIPT_TYPE = require('./publish/run-script').SCRIPT_TYPE;
const publish = require('./publish/publish-script');
const getOptions = require('./publish-options').getOptions;

// NOTE: adopted from https://github.com/sindresorhus/np/blob/master/index.js#L78
function assertNode6PublishingPrerequisites() {
    return exec('npm version --json').then((out) => {
        const npmVersion = JSON.parse(out).npm;
        const isNode6 = semver.gte(process.version, '6.0.0');
        const isSafeNpmVersion = semver.satisfies(
            npmVersion,
            '>=2.15.8 <3.0.0 || >=3.10.1'
        );

        if (isNode6 && !isSafeNpmVersion)
            throw new Error(
                `npm@${npmVersion} has known issues publishing when running Node.js 6. Please upgrade npm or downgrade Node and publish again. See: https://github.com/npm/npm/issues/5082`
            );
    });
}

module.exports = function(opts, projectDir) {
    let pkgInfo = null;

    opts = getOptions(opts, projectDir);

    return assertNode6PublishingPrerequisites()
        .then(
            () =>
                opts.prePublishScript &&
                runScript(opts.prePublishScript, SCRIPT_TYPE.prePublish)
        )
        .then(() => pkgd())
        .then((info) => (pkgInfo = info))
        .then(() => validate(opts.validations, pkgInfo))
        .then(() => printReleaseInfo(pkgInfo.cfg.version, opts.publishTag))
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
        });
};
