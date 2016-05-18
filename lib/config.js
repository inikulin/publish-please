'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var readFile = require('fs').readFileSync;
var writeFile = require('fs').writeFileSync;
var pathJoin = require('path').join;
var chalk = require('chalk');
var defaults = require('lodash/defaultsDeep');
var DEFAULT_OPTIONS = require('./default-options');
var inputWithConfirmation = require('./utils/inquires').inputWithConfirmation;
var input = require('./utils/inquires').input;
var _confirm = require('./utils/inquires').confirm;
var validationConfigurators = require('./validations').configurators;

var optionsConfigurators = {
    prePublishScript: function prePublishScript(currentVal) {
        return inputWithConfirmation('Do you want to run any scripts before publishing (e.g. build steps, tests)?', false, 'Input pre-publish script', currentVal);
    },

    publishTag: function publishTag(currentVal) {
        return input('Specify release tag with which you package will be published', currentVal);
    },

    confirm: function confirm(currentVal) {
        return _confirm('Do you want manually confirm publishing?', currentVal);
    }
};

function getCurrentOpts(rcFile) {
    var optsFromFile = null;

    try {
        optsFromFile = JSON.parse(readFile(rcFile).toString());
    } catch (err) {
        optsFromFile = {};
    }

    return defaults({}, optsFromFile, DEFAULT_OPTIONS);
}

function configureOptsObject(obj, configurators, optType) {
    return (0, _keys2.default)(configurators).reduce(function (chain, prop) {
        return chain.then(function () {
            console.log(chalk.blue('-- Configuring ' + optType + ' "' + prop + '":'));

            return configurators[prop](obj[prop]);
        }).then(function (val) {
            console.log();

            obj[prop] = val;
        });
    }, _promise2.default.resolve());
}

function configure(opts) {
    console.log();

    return configureOptsObject(opts, optionsConfigurators, 'option').then(function () {
        return configureOptsObject(opts.validations, validationConfigurators, 'validation');
    }).then(function () {
        console.log(chalk.green('-- Current configuration:'));
        console.log();
        console.log((0, _stringify2.default)(opts, null, 2));
        console.log();

        return _confirm('Is this OK?', true);
    }).then(function (yes) {
        return !yes && configure(opts);
    });
}

module.exports = function (projectDir) {
    var rcFile = pathJoin(projectDir || process.cwd(), '.publishrc');
    var opts = getCurrentOpts(rcFile);

    return configure(opts).then(function () {
        return writeFile(rcFile, (0, _stringify2.default)(opts, null, 2));
    }).then(function () {
        return console.log('Configuration has been successfully saved.');
    }).catch(function (err) {
        return console.log(chalk.red('ERROR: \n') + err.stack);
    });
};