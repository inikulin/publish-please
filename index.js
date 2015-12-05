var exec           = require('child_process').exec;
var elegantSpinner = require('elegant-spinner');
var logUpdate      = require('log-update');
var inquirer       = require('inquirer');
var chalk          = require('chalk');
var PluginError    = require('gulp-util').PluginError;
var Promise        = require('pinkie-promise');
var OS             = require('os-family');

function createSpinner (text) {
    var frame = elegantSpinner();

    var animation = setInterval(function () {
        logUpdate(text + ' ' + frame());
    });

    animation.unref();

    return function () {
        clearInterval(animation);
        logUpdate(text + ' ' + chalk.green(OS.win ? '√' : '✓'));
        console.log();
    };
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

function git (command) {
    return new Promise(function (resolve, reject) {
        exec('git ' + command, function (err, stdout) {
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
                throw new PluginError('Expected git tag to be ' + chalk.gray(pkgVersion) +
                                      ' or ' + chalk.gray('v' + pkgVersion) + ', ' +
                                      'but it was ' + chalk.gray(tag) + '.');
            }

            stopSpinner();
        })
}

function validateBranch (expected) {
    var stopSpinner = createSpinner('Validating branch');

    return git("git branch | sed -n '/\\* /s///p'")
        .then(function (branch) {
            if (branch !== expected) {
                throw new PluginError('Expected branch to be ' + chalk.gray(expected) +
                                      'but it was ' + chalk.gray(branch) + '.');
            }

            stopSpinner();
        });
}
