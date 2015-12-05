var exec        = require('child_process').exec;
var inquirer    = require("../lib/inquirer");
var PluginError = require('gulp-util').PluginError;
var Promise     = require('pinkie-promise');

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
    return git('describe --tags')
        .then(function (tag) {
            if (!tag)
                throw new PluginError('Latest commit doesn\'t have git tag.');

            if (tag !== pkgVersion && tag !== 'v' + pkgVersion) {
                throw new PluginError('Expected git tag to be `' + pkgVersion + '`' +
                                      ' or `v' + pkgVersion + '`, but it was `' + tag + '`');
            }
        });
}
