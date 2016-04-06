'use strict';

const isSensitiveData = require('ban-sensitive-files');
const globby          = require('globby');

module.exports = {
    option:       'sensitiveData',
    statusText:   'Checking for the sensitive data in the working tree',
    defaultParam: true,

    // TODO

    run (opts, pkgInfo) {
        return Promise.resolve()
            .then(() => {
                if (opts && Array.isArray(opts.ignore))
                    return globby(opts.ignore);

                return [];
            })
            .then(ignore => {
                const errs   = [];
                const addErr = errs.push.bind(errs);

                pkgInfo.files
                    .filter(path => ignore.indexOf(path) < 0)
                    .forEach(path => isSensitiveData(path, addErr));

                if (errs.length) {
                    const msg = errs
                        .map(err => err
                            .split(/\n/)
                            .map(line => '    ' + line)
                            .join('\n')
                        )
                        .join('\n');

                    throw 'Sensitive data found in the working tree:\n' + msg;
                }
            });
    }
};
