'use strict';

const readFile        = require('fs').readFileSync;
const chalk           = require('chalk');
const defaults        = require('lodash/defaultsDeep');
const pkgd            = require('pkgd');
const exec            = require('cp-sugar').exec;
const spawn           = require('cp-sugar').spawn;
const emoji           = require('node-emoji').emoji;
const validate        = require('./validations').validate;
const confirm         = require('./utils/inquires').confirm;
const DEFAULT_OPTIONS = require('./default-options');


function printReleaseInfo (pkgVersion, publishTag) {
    let commitInfo = null;

    return exec('git log -1 --oneline')
        .then(info => {
            commitInfo = info;

            return exec('npm whoami --silent');
        })
        .catch(() => chalk.red('<not logged in>'))
        .then(publisher => {
            console.log(chalk.yellow('Release info'));
            console.log(chalk.yellow('------------'));
            console.log('  ' + chalk.magenta('Version:       ') + pkgVersion);
            console.log('  ' + chalk.magenta('Latest commit: ') + commitInfo);
            console.log('  ' + chalk.magenta('Publish tag:   ') + publishTag);
            console.log('  ' + chalk.magenta('Publisher:     ') + publisher);
            console.log();
        });
}

function runPrePublishScript (command) {
    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running pre-publish script'));
        console.log(chalk.yellow('-------------------------'));
    }

    return spawn(command, module.exports.testMode)
        .then(() => {
            if (!module.exports.testMode) {
                console.log(chalk.yellow('-------------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log();
            }
        });
}

function publish (publishTag) {
    const command = `npm publish --tag ${publishTag} --with-publish-please`;

    if (!module.exports.testMode)
        return spawn(command).then(() => console.log('\n', emoji.tada, emoji.tada, emoji.tada));

    return command;
}

function getOptions (opts) {
    let rcFileContent = null;
    let rcOpts        = {};

    try {
        rcFileContent = readFile('.publishrc').toString();
    }
    catch (err) {
        // NOTE: we don't have .publishrc file, just ignore the error
    }

    if (rcFileContent) {
        try {
            rcOpts = JSON.parse(rcFileContent);
        }
        catch (err) {
            throw new Error('.publishrc is not a valid JSON file.');
        }

        opts = defaults({}, opts, rcOpts);
    }

    return defaults({}, opts, DEFAULT_OPTIONS);
}

module.exports = function (opts) {
    let pkgInfo = null;

    opts = getOptions(opts);

    return Promise.resolve()
        .then(() => opts.prePublishScript && runPrePublishScript(opts.prePublishScript))
        .then(() => pkgd())
        .then(info => pkgInfo = info)
        .then(() => validate(opts.validations, pkgInfo))
        .then(() => !module.exports.testMode && printReleaseInfo(pkgInfo.cfg.version, opts.publishTag))
        .then(() => opts.confirm ? confirm('Are you sure you want to publish this version to npm?', false) : true)
        .then(ok => ok && publish(opts.publishTag));
};

// Exports for the testing purposes
module.exports.testMode   = false;
module.exports.getOptions = getOptions;
