'use strict';

const pathJoin = require('path').join;
const nsp      = require('nsp');

module.exports = {
    option:       'vulnerableDependencies',
    statusText:   'Checking for the vulnerable dependencies',
    defaultParam: true,

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