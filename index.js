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
