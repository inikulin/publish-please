'use strict';

const exec = require('cp-sugar').exec;

module.exports = {
    option:       'untrackedFiles',
    statusText:   'Checking for the untracked files',
    defaultParam: true,

    run () {
        return exec('git status --porcelain')
            .then(result => {
                if (/^\?\?/m.test(result))
                    throw 'There are untracked files in the working tree.';
            });
    }
};
