'use strict';

const pathJoin = require('path').join;
const nsp      = require('nsp');
const confirm  = require('../utils/inquires').confirm;


module.exports = {
    option:       'vulnerableDependencies',
    statusText:   'Checking for the vulnerable dependencies',
    defaultParam: true,

    configurator (currentVal) {
        return confirm(
            "Would you like to verify that your package doesn't have vulnerable dependencies before publishing?",
            currentVal
        );
    },

    run () {
        return new Promise((resolve, reject) => {
            const pkg = pathJoin(process.cwd(), 'package.json');

            nsp.check({ package: pkg }, (err, data) => {
                if (err || data.length > 0)
                    reject(nsp.formatters.summary(err, data));
                else
                    resolve();
            });
        });
    }
};
