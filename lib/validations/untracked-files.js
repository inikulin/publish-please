'use strict';

const exec    = require('cp-sugar').exec;
const confirm = require('../utils/inquires').confirm;

module.exports = {
    option:       'untrackedFiles',
    statusText:   'Checking for the untracked files',
    defaultParam: true,

    configurator (currentVal) {
        return confirm(
            'Would you like to verify that there are no files that are ' +
            'not tracked by git in your working tree before publishing?',
            currentVal
        );
    },

    run () {
        return exec('git status --porcelain')
            .then(result => {
                if (/^\?\?/m.test(result))
                    throw 'There are untracked files in the working tree.';
            });
    }
};
