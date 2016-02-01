'use strict';

const PluginError = require('gulp-util').PluginError;

module.exports = function throwError (msg) {
    throw new PluginError('publish-please', msg);
};
