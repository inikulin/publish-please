'use strict';

const isSensitiveData = require('ban-sensitive-files');

module.exports = {
    option:     'sensitiveDataAudit',
    statusText: 'Performing sensitive data audit',

    run (_, pkgInfo) {
        return Promise.resolve().then(() => {
            const errs   = [];
            const addErr = errs.push.bind(errs);

            pkgInfo.files.forEach(path => isSensitiveData(path, addErr));

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
