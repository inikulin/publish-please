'use strict';

var exec = require('cp-sugar').exec;
var inputWithConfirmation = require('../utils/inquires').inputWithConfirmation;

module.exports = {
    option: 'branch',
    statusText: 'Validating branch',
    defaultParam: 'master',

    configurator: function configurator(currentVal) {
        return inputWithConfirmation('Would you like to verify that you are publishing from the correct git branch?', false, 'Which branch should it be?', currentVal);
    },
    run: function run(expected) {
        return exec("git branch | sed -n '/\\* /s///p'").then(function (branch) {
            if (branch !== expected) throw 'Expected branch to be `' + expected + '`, but it was `' + branch + '`.';
        });
    }
};