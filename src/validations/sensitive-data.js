'use strict';

const isSensitiveData = require('ban-sensitive-files');
const globby = require('globby');
const confirm = require('../utils/inquires').confirm;
const inputList = require('../utils/inquires').inputList;
const Promise = require('pinkie-promise');

module.exports = {
    option: 'sensitiveData',
    statusText: 'Checking for the sensitive data in the working tree',
    defaultParam: true,
    /* eslint-disable indent */
    configurator(currentVal) {
        function configureIgnores() {
            const ignore = Array.isArray(currentVal.ignore)
                ? currentVal.ignore
                : [];

            return confirm(
                'Is there any files that you want to exclude from check?',
                false
            )
                .then(
                    (yes) =>
                        yes
                            ? inputList(
                                  'List files you want to exclude (comma-separated, you can use glob patterns)',
                                  ignore
                              )
                            : true
                )
                .then(
                    (answer) =>
                        Array.isArray(answer) ? { ignore: answer } : answer
                );
        }
        /* eslint-enable indent */

        return confirm(
            'Would you like to verify that there is no sensitive data in your working tree?',
            !!currentVal
        ).then((yes) => (yes ? configureIgnores() : false));
    },
    canRun: () => true,
    run(opts, pkgInfo) {
        return Promise.resolve()
            .then(() => {
                if (opts && Array.isArray(opts.ignore))
                    return globby(opts.ignore);

                return [];
            })
            .then((ignore) => {
                const errs = [];
                const addErr = errs.push.bind(errs);

                pkgInfo.files
                    .filter((path) => ignore.indexOf(path) < 0)
                    .forEach((path) => isSensitiveData(path, addErr));

                if (errs.length) {
                    const msg = errs
                        .map((err) =>
                            err
                                .split(/\n/)
                                .map((line) => '    ' + line)
                                .join('\n')
                        )
                        .join('\n');

                    throw 'Sensitive data found in the working tree:\n' + msg;
                }
            });
    },
};
