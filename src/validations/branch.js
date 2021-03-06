'use strict';

const exec = require('cp-sugar').exec;
const inputWithConfirmation = require('../utils/inquires')
    .inputWithConfirmation;

module.exports = {
    option: 'branch',
    statusText: 'Validating branch',
    defaultParam: 'master',

    configurator(currentVal) {
        return inputWithConfirmation(
            'Would you like to verify that you are publishing from the correct git branch?',
            false,
            'Which branch should it be?',
            currentVal
        );
    },
    canRun: () => true,
    run(expected) {
        return exec('git branch --no-color')
            .then((branches) =>
                branches
                    .split('\n')
                    .filter((branch) => branch.includes('* '))[0]
                    .replace('* ', '')
            )
            .then((branch) => {
                if (expected.match(/^\/.*\/$/)) {
                    const regexp = new RegExp(
                        expected.replace(/^\/(.*)\/$/, '$1')
                    );
                    if (!regexp.test(branch)) {
                        throw `Expected branch to match ${expected}, but it was '${branch}'.`;
                    }
                } else if (branch !== expected)
                    throw `Expected branch to be '${expected}', but it was '${branch}'.`;
            });
    },
};
