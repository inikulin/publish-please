var exec           = require('child_process').exec;
var fs             = require('fs');
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
        logUpdate(chalk.yellow(frame()) + ' ' + text);
    });

    animation.unref();

    return function (ok) {
        var status = ok ?
                     chalk.green(OS.win ? '√' : '✓') :
                     chalk.red(OS.win ? '×' : '✖');

        clearInterval(animation);
        logUpdate(status + ' ' + text);
        console.log();
    };
}

function throwError (msg) {
    throw new PluginError('publish-please', msg);
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

    return git('describe --exact-match --tags HEAD')
        .catch(function () {
            stopSpinner(false);
            throw "Latest commit doesn't have git tag.";
        })
        .then(function (tag) {
            if (tag !== pkgVersion && tag !== 'v' + pkgVersion) {
                stopSpinner(false);
                throw 'Expected git tag to be `' + pkgVersion + '` or ' +
                      '`v' + pkgVersion + '`, but it was `' + tag + '`.';
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
                throw 'Expected branch to be `' + expected + '`, but it was `' + branch + '`.';
            }

            stopSpinner(true);
        });
}

function printReleaseInfo (pkgVersion) {
    return git('log -1 --oneline')
        .then(function (commitInfo) {
            console.log(chalk.yellow('Release info'));
            console.log(chalk.yellow('------------'));
            console.log('  ' + chalk.magenta('Version:       ') + pkgVersion);
            console.log('  ' + chalk.magenta('Latest commit: ') + commitInfo);
            console.log();
        });
}

function readPkgVersion () {
    try {
        var version = JSON.parse(fs.readFileSync('package.json').toString()).version;
    }
    catch (err) {
        throwError("Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
    }

    if (!version)
        throwError('Version is not specified in package.json.');

    return version;
}

function runValidations (opts, pkgVersion) {
    var errs     = [];
    var addError = errs.push.bind(errs);

    var validations = [
        function () {
            if (opts.validateBranch)
                return validateBranch(opts.validateBranch);
        },
        function () {
            if (opts.validateGitTag)
                return validateGitTag(pkgVersion);
        }
    ];

    var validationPromise = validations.reduce(function (validationPromise, validation) {
        return validationPromise
            .then(validation)
            .catch(addError);
    }, Promise.resolve());

    return validationPromise.then(function () {
        if (errs.length) {
            var msg = errs.map(function (err) {
                return '  * ' + err;
            }).join('\n');

            throwError(msg);
        }
    });
}

module.exports = function (opts) {
    var pkgVersion = null;

    opts = defaults(opts, {
        confirm:        true,
        validateGitTag: true,
        validateBranch: 'master'
    });

    return Promise.resolve()
        .then(function () {
            pkgVersion = readPkgVersion();
        })
        .then(function () {
            return runValidations(opts, pkgVersion);
        })
        .then(function () {
            if (!module.exports.testMode)
                return printReleaseInfo(pkgVersion);
        })
        .then(function () {
            if (opts.confirm)
                return confirmPublishing();
            else
                return true;
        });
};

// Exports for the testing purposes
module.exports.git      = git;
module.exports.testMode = false;

