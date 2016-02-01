'use strict';

const readFile      = require('fs').readFileSync;
const inquirer      = require('inquirer');
const chalk         = require('chalk');
const defaults      = require('defaults');
const elegantStatus = require('elegant-status');
const noop          = require('noop-fn');
const pkgd          = require('pkgd');
const exec          = require('cp-sugar').exec;
const spawn         = require('cp-sugar').spawn;
const emoji         = require('node-emoji').emoji;
const validations   = require('./validations');

function confirmPublish () {
    return new Promise(resolve => {
        const question = {
            type:    'confirm',
            name:    'publish',
            message: 'Are you sure you want to publish this version to npm?',
            default: false
        };

        inquirer.prompt(question, answer => resolve(answer.publish));
    });
}

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

function runValidations (opts, pkgInfo) {
    const errs             = [];
    const validationsToRun = validations.filter(validation => !!opts[validation.option]);

    if (!validationsToRun.length)
        return Promise.resolve();

    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running validations'));
        console.log(chalk.yellow('-------------------'));
        console.log();
    }

    return validationsToRun
        .reduce((validationPromise, validation) => {
            const done = module.exports.testMode ? noop : elegantStatus(validation.statusText);

            return validationPromise
                .then(() => validation.run(opts[validation.option], pkgInfo))
                .then(() => done(true))
                .catch(err => {
                    errs.push(err);
                    done(false);
                });
        }, Promise.resolve())
        .then(() => {
            if (errs.length) {
                const msg = errs.map(err => '  * ' + err).join('\n');

                throw new Error(msg);
            }
            else if (!module.exports.testMode) {
                console.log(chalk.yellow('-------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log();
            }
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

        opts = defaults(opts, rcOpts);
    }

    return defaults(opts, {
        confirm:            true,
        sensitiveDataAudit: true,
        checkUncommitted:   true,
        checkUntracked:     true,
        validateGitTag:     true,
        validateBranch:     'master',
        tag:                'latest',
        prepublishScript:   null
    });
}

module.exports = function (opts) {
    let pkgInfo = null;

    opts = getOptions(opts);

    return pkgd()
        .then(info => {

            pkgInfo = info;

            if (opts.prepublishScript)
                return runPrepublishScript(opts.prepublishScript);
        })
        .then(() => runValidations(opts, pkgInfo))
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
