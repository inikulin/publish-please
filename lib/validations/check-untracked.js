'use strict';

const exec = require('../utils/cp').exec;

module.exports = {
    option:     'checkUntracked',
    statusText: 'Checking for the untracked files',

    run () {
        return exec('git status --porcelain')
            .then(result => {
                if (/^\?\?/m.test(result))
                    throw 'There are untracked files in the working tree.';
            });
    }
};
