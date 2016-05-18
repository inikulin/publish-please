'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isSensitiveData = require('ban-sensitive-files');
var globby = require('globby');
var confirm = require('../utils/inquires').confirm;
var inputList = require('../utils/inquires').inputList;

module.exports = {
    option: 'sensitiveData',
    statusText: 'Checking for the sensitive data in the working tree',
    defaultParam: true,

    configurator: function configurator(currentVal) {
        function configureIgnores() {
            var ignore = Array.isArray(currentVal.ignore) ? currentVal.ignore : [];

            return confirm('Is there any files that you want to exclude from check?', false).then(function (yes) {
                return yes ? inputList('List files you want to exclude (comma-separated, you can use glob patterns)', ignore) : true;
            }).then(function (answer) {
                return Array.isArray(answer) ? { ignore: answer } : answer;
            });
        }

        return confirm('Would you like to verify that there is no sensitive data in your working tree?', !!currentVal).then(function (yes) {
            return yes ? configureIgnores() : false;
        });
    },
    run: function run(opts, pkgInfo) {
        return _promise2.default.resolve().then(function () {
            if (opts && Array.isArray(opts.ignore)) return globby(opts.ignore);

            return [];
        }).then(function (ignore) {
            var errs = [];
            var addErr = errs.push.bind(errs);

            pkgInfo.files.filter(function (path) {
                return ignore.indexOf(path) < 0;
            }).forEach(function (path) {
                return isSensitiveData(path, addErr);
            });

            if (errs.length) {
                var msg = errs.map(function (err) {
                    return err.split(/\n/).map(function (line) {
                        return '    ' + line;
                    }).join('\n');
                }).join('\n');

                throw 'Sensitive data found in the working tree:\n' + msg;
            }
        });
    }
};