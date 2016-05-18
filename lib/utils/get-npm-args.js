'use strict';

// NOTE: the following code was partially adopted from https://github.com/iarna/in-publish

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function getNpmArgs() {
    var npmArgv = null;

    try {
        npmArgv = JSON.parse(process.env['npm_config_argv']);
    } catch (err) {
        return null;
    }

    if ((typeof npmArgv === 'undefined' ? 'undefined' : (0, _typeof3.default)(npmArgv)) !== 'object' || !npmArgv.cooked || !Array.isArray(npmArgv.cooked)) return null;

    return npmArgv.cooked;
};