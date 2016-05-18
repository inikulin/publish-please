'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pathJoin = require('path').join;
var nsp = require('nsp');
var confirm = require('../utils/inquires').confirm;

module.exports = {
    option: 'vulnerableDependencies',
    statusText: 'Checking for the vulnerable dependencies',
    defaultParam: true,

    configurator: function configurator(currentVal) {
        return confirm("Would you like to verify that your package doesn't have vulnerable dependencies before publishing?", currentVal);
    },
    run: function run() {
        return new _promise2.default(function (resolve, reject) {
            var pkg = pathJoin(process.cwd(), 'package.json');

            nsp.check({ package: pkg }, function (err, data) {
                if (err || data.length > 0) reject(nsp.formatters.summary(err, data));else resolve();
            });
        });
    }
};