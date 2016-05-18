'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var noop = require('lodash/noop');
var chalk = require('chalk');
var elegantStatus = require('elegant-status');
var emoji = require('node-emoji').emoji;

var validations = [require('./vulnerable-dependencies'), require('./uncommitted-changes'), require('./untracked-files'), require('./sensitive-data'), require('./branch'), require('./git-tag')];

function runValidation(validation, param, pkgInfo, errs) {
    var done = module.exports.testMode ? noop : elegantStatus(validation.statusText);

    return validation.run(param, pkgInfo).then(function () {
        return done(true);
    }).catch(function (err) {
        errs.push(err);
        done(false);
    });
}

module.exports = {
    testMode: false,

    DEFAULT_OPTIONS: validations.reduce(function (opts, validation) {
        opts[validation.option] = validation.defaultParam;
        return opts;
    }, {}),

    configurators: validations.reduce(function (opts, validation) {
        opts[validation.option] = validation.configurator;
        return opts;
    }, {}),

    validate: function validate(opts, pkgInfo) {
        var errs = [];
        var validationsToRun = validations.filter(function (validation) {
            return !!opts[validation.option];
        });

        if (!validationsToRun.length) return _promise2.default.resolve();

        if (!module.exports.testMode) {
            console.log(chalk.yellow('Running validations'));
            console.log(chalk.yellow('-------------------'));
            console.log();
        }

        return validationsToRun.reduce(function (validationChain, validation) {
            return validationChain.then(function () {
                return runValidation(validation, opts[validation.option], pkgInfo, errs);
            });
        }, _promise2.default.resolve()).then(function () {
            if (errs.length) {
                var msg = errs.map(function (err) {
                    return '  * ' + err;
                }).join('\n');

                throw new Error(msg);
            } else if (!module.exports.testMode) {
                console.log(chalk.yellow('-------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log();
            }
        });
    }
};