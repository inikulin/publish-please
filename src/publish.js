'use strict';

const readFile = require('fs').readFileSync;
const semver = require('semver');
const defaults = require('lodash/defaultsDeep');
const pkgd = require('pkgd');
const exec = require('cp-sugar').exec;
const spawn = require('cp-sugar').spawn;
const emoji = require('node-emoji').emoji;
const validate = require('./validations').validate;
const confirm = require('./utils/inquires').confirm;
const DEFAULT_OPTIONS = require('./default-options');
const pathJoin = require('path').join;
const printReleaseInfo = require('./publish/print-release-info');
const runScript = require('./publish/run-script');
const SCRIPT_TYPE = require('./publish/run-script').SCRIPT_TYPE;

/* eslint-disable indent */
function publish(publishCommand, publishTag) {
    const command = `${publishCommand} --tag ${publishTag} --with-publish-please`;
    return spawn(command)
        .then((res) => {
            console.log('\n', emoji.tada, emoji.tada, emoji.tada);
            return res || true;
        })
        .then(() => command);
}
/* eslint-enable indent */

function getOptions(opts, projectDir) {
    let rcFileContent = null;
    let rcOpts = {};

    try {
        projectDir = projectDir ? projectDir : process.cwd();
        const publishrcFilePath = pathJoin(projectDir, '.publishrc');
        rcFileContent = readFile(publishrcFilePath).toString();
    } catch (err) {
        // NOTE: we don't have .publishrc file, just ignore the error
    }

    if (rcFileContent) {
        try {
            rcOpts = JSON.parse(rcFileContent);
        } catch (err) {
            throw new Error('.publishrc is not a valid JSON file.');
        }

        opts = defaults({}, opts, rcOpts);
    }

    return defaults({}, opts, DEFAULT_OPTIONS);
}

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

// Exports for the testing purposes
module.exports.getOptions = getOptions;
