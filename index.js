var exec           = require('child_process').exec;
var elegantSpinner = require('elegant-spinner');
var logUpdate      = require('log-update');
var inquirer       = require('inquirer');
var chalk          = require('chalk');
var defaults       = require('defaults');
var PluginError    = require('gulp-util').PluginError;
var Promise        = require('pinkie-promise');
var OS             = require('os-family');
var noop           = require('noop-fn');

function createSpinner (text) {
    if (module.exports.testMode)
        return noop;

    var frame = elegantSpinner();

    var animation = setInterval(function () {
        logUpdate(text + ' ' + frame());
    });

    animation.unref();

    return function (ok) {
        var status = ok ?
                     chalk.green(OS.win ? '√' : '✓') :
                     chalk.red(OS.win ? '×' : '✖');

        clearInterval(animation);
        logUpdate(text + ' ' + status);
        console.log();
    };
}

function throwError (msg) {
    throw new PluginError('gulp-npm-publish', msg);
}

function confirmPublishing () {
    return new Promise(function (resolve) {
        var question = {
            type:    "confirm",
            name:    "publish",
            message: "Are you sure you want to publish this version to npm?",
            default: false
        };

        inquirer.prompt(question, function (answer) {
            resolve(answer.publish);
        });
    });
}

function git (command, cwd) {
    return new Promise(function (resolve, reject) {
        exec('git ' + command, { cwd: cwd || process.cwd }, function (err, stdout) {
            if (err)
                reject(err);
            else
                resolve(stdout.trim());
        });
    });
}

function validateGitTag (pkgVersion) {
    var stopSpinner = createSpinner('Validating git tag');

    return git('describe --tags')
        .catch(function () {
            throw new PluginError("Latest commit doesn't have git tag.");
        })
        .then(function (tag) {
            if (tag !== pkgVersion && tag !== 'v' + pkgVersion) {
                stopSpinner(false);

                throwError('Expected git tag to be `' + pkgVersion + '` or ' +
                           '`v' + pkgVersion + '`, but it was `' + tag + '`.');
            }

            stopSpinner(true);
        })
}

function validateBranch (expected) {
    var stopSpinner = createSpinner('Validating branch');

    return git("branch | sed -n '/\\* /s///p'")
        .then(function (branch) {
            if (branch !== expected) {
                stopSpinner(false);
                throwError('Expected branch to be `' + expected + '`, but it was `' + branch + '`.');
            }

            stopSpinner(true);
        });
}

module.exports = function (opts) {
    opts = defaults(opts, {
        confirm:        true,
        validateGitTag: true,
        validateBranch: 'master'
    });

    return Promise.resolve()
        .then(function () {
            if (opts.validateBranch)
                return validateBranch(opts.validateBranch);
        });

};

// Exports for the testing purposes
module.exports.git      = git;
module.exports.testMode = false;

