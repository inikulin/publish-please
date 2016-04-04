'use strict';

const exec = require('cp-sugar').exec;

module.exports = {
    option:       'uncommittedChanges',
    statusText:   'Checking for the uncommitted changes',
    defaultParam: true,

    run () {
        return exec('git status --porcelain')
            .then(result => {
                if (/^([ADRM]| [ADRM])/m.test(result))
                    throw 'There are uncommitted changes in the working tree.';
            });
    }
};
