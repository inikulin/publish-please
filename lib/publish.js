'use strict';

const readFile = require('fs').readFileSync;
const inquirer = require('inquirer');
const chalk    = require('chalk');
const defaults = require('lodash/defaultsDeep');
const pkgd     = require('pkgd');
const exec     = require('cp-sugar').exec;
const spawn    = require('cp-sugar').spawn;
const emoji    = require('node-emoji').emoji;
const validate = require('./validations').validate;


const DEFAULT_OPTIONS = {
    sensitiveDataAudit: true,
    checkUncommitted:   true,
    checkUntracked:     true,
    validateGitTag:     true,
    validateBranch:     'master',

    confirm:          true,
    tag:              'latest',
    prepublishScript: null
};


function printReleaseInfo (pkgVersion, tag) {
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
            console.log('  ' + chalk.magenta('Publish tag:   ') + tag);
            console.log('  ' + chalk.magenta('Publisher:     ') + publisher);
            console.log();
        });
}

function runPrepublishScript (command) {
    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running prepublish script'));
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

function confirmPublish () {
    return new Promise(resolve => {
        inquirer.prompt({
            type:    'confirm',
            name:    'publish',
            message: 'Are you sure you want to publish this version to npm?',
            default: false
        }, answer => resolve(answer.publish));
    });
}

function publish (tag) {
    const command = 'npm publish --tag ' + tag;

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
        .then(() => {
            if (opts.prepublishScript)
                return runPrepublishScript(opts.prepublishScript);
        })
        .then(pkgd)
        .then(info => {
            pkgInfo = info;
        })
        .then(() => validate(opts, pkgInfo))
        .then(() => {
            if (!module.exports.testMode)
                return printReleaseInfo(pkgInfo.cfg.version, opts.tag);
        })
        .then(() => opts.confirm ? confirmPublish() : true)
        .then(ok => {
            if (ok)
                return publish(opts.tag);
        });
};

// Exports for the testing purposes
module.exports.testMode   = false;
module.exports.getOptions = getOptions;
