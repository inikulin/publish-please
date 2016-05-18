'use strict';

var exec = require('cp-sugar').exec;
var confirm = require('../utils/inquires').confirm;

module.exports = {
    option: 'uncommittedChanges',
    statusText: 'Checking for the uncommitted changes',
    defaultParam: true,

    configurator: function configurator(currentVal) {
        return confirm('Would you like to verify that there are no uncommitted changes in your working tree before publishing?', currentVal);
    },
    run: function run() {
        return exec('git status --porcelain').then(function (result) {
            if (/^([ADRM]| [ADRM])/m.test(result)) throw 'There are uncommitted changes in the working tree.';
        });
    }
};