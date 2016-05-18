'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var readFile = require('fs').readFileSync;
var chalk = require('chalk');
var defaults = require('lodash/defaultsDeep');
var pkgd = require('pkgd');
var exec = require('cp-sugar').exec;
var spawn = require('cp-sugar').spawn;
var emoji = require('node-emoji').emoji;
var validate = require('./validations').validate;
var confirm = require('./utils/inquires').confirm;
var DEFAULT_OPTIONS = require('./default-options');

function printReleaseInfo(pkgVersion, publishTag) {
    var commitInfo = null;

    return exec('git log -1 --oneline').then(function (info) {
        commitInfo = info;

        return exec('npm whoami --silent');
    }).catch(function () {
        return chalk.red('<not logged in>');
    }).then(function (publisher) {
        console.log(chalk.yellow('Release info'));
        console.log(chalk.yellow('------------'));
        console.log('  ' + chalk.magenta('Version:       ') + pkgVersion);
        console.log('  ' + chalk.magenta('Latest commit: ') + commitInfo);
        console.log('  ' + chalk.magenta('Publish tag:   ') + publishTag);
        console.log('  ' + chalk.magenta('Publisher:     ') + publisher);
        console.log();
    });
}

function runPrePublishScript(command) {
    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running pre-publish script'));
        console.log(chalk.yellow('-------------------------'));
    }

    return spawn(command, module.exports.testMode).then(function () {
        if (!module.exports.testMode) {
            console.log(chalk.yellow('-------------------------'));
            console.log(emoji['+1'], emoji['+1'], emoji['+1']);
            console.log();
        }
    });
}

function publish(publishTag) {
    var command = 'npm publish --tag ' + publishTag + ' --with-publish-please';

    if (!module.exports.testMode) return spawn(command).then(function () {
        return console.log('\n', emoji.tada, emoji.tada, emoji.tada);
    });

    return command;
}

function getOptions(opts) {
    var rcFileContent = null;
    var rcOpts = {};

    try {
        rcFileContent = readFile('.publishrc').toString();
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

module.exports = function (opts) {
    var pkgInfo = null;

    opts = getOptions(opts);

    return _promise2.default.resolve().then(function () {
        return opts.prePublishScript && runPrePublishScript(opts.prePublishScript);
    }).then(function () {
        return pkgd();
    }).then(function (info) {
        return pkgInfo = info;
    }).then(function () {
        return validate(opts.validations, pkgInfo);
    }).then(function () {
        return !module.exports.testMode && printReleaseInfo(pkgInfo.cfg.version, opts.publishTag);
    }).then(function () {
        return opts.confirm ? confirm('Are you sure you want to publish this version to npm?', false) : true;
    }).then(function (ok) {
        return ok && publish(opts.publishTag);
    });
};

// Exports for the testing purposes
module.exports.testMode = false;
module.exports.getOptions = getOptions;