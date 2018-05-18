const noop          = require('lodash/noop');
const chalk         = require('chalk');
const elegantStatus = require('elegant-status');
const emoji         = require('node-emoji').emoji;
const Promise       = require('pinkie-promise');

const validations = [
    require('./vulnerable-dependencies'),
    require('./uncommitted-changes'),
    require('./untracked-files'),
    require('./sensitive-data'),
    require('./branch'),
    require('./git-tag')
];

function runValidation (validation, param, pkgInfo, errs) {
    const done = module.exports.testMode ? noop : elegantStatus(validation.statusText);

    return validation
        .run(param, pkgInfo)
        .then(() => done(true))
        .catch(err => {
            Array.isArray(err)
                ? errs.push(...err)
                : errs.push(err);
            done(false);
        });
}

module.exports = {
    testMode: false,

    DEFAULT_OPTIONS: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.defaultParam;
        return opts;
    }, {}),

    configurators: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.configurator;
        return opts;
    }, {}),

    validate: function (opts, pkgInfo) {
        const errs             = [];
        const validationsToRun = validations.filter(validation => !!opts[validation.option]);

        if (!validationsToRun.length)
            return Promise.resolve();

        if (!module.exports.testMode) {
            console.log(chalk.yellow('Running validations'));
            console.log(chalk.yellow('-------------------'));
            console.log();
        }

        return validationsToRun
            .reduce((validationChain, validation) => {
                return validationChain.then(() => runValidation(validation, opts[validation.option], pkgInfo, errs));
            }, Promise.resolve())
            .then(() => {
                if (errs.length) {
                    const msg = errs.map(err => '  * ' + err).join('\n');
                    throw new Error(msg);
                }
                else if (!module.exports.testMode) {
                    console.log(chalk.yellow('-------------------'));
                    console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                    console.log();
                }
            });
    }
};
