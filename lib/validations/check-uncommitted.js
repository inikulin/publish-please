'use strict';

const exec = require('../utils/cp').exec;

module.exports = {
    option:      'checkUncommitted',
    spinnerText: 'Checking for the uncommitted changes',

    run () {
        return exec('git status --porcelain')
            .then(result => {
                if (/^([ADRM]| [ADRM])/m.test(result))
                    throw 'There are uncommitted changes in the working tree.';
            });
    }
};
