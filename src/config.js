'use strict';

const readFile                = require('fs').readFileSync;
const writeFile               = require('fs').writeFileSync;
const pathJoin                = require('path').join;
const chalk                   = require('chalk');
const defaults                = require('lodash/defaultsDeep');
const Promise                 = require('pinkie-promise');
const DEFAULT_OPTIONS         = require('./default-options');
const inputWithConfirmation   = require('./utils/inquires').inputWithConfirmation;
const input                   = require('./utils/inquires').input;
const confirm                 = require('./utils/inquires').confirm;
const validationConfigurators = require('./validations').configurators;


const optionsConfigurators = {
    prePublishScript: currentVal => inputWithConfirmation(
        'Do you want to run any scripts before publishing (e.g. build steps, tests)?',
        false,
        'Input pre-publish script',
        currentVal
    ),

    postPublishScript: currentVal => inputWithConfirmation(
        'Do you want to run any scripts after succesful publishing (e.g. release announcements, binary uploading)?',
        false,
        'Input post-publish script',
        currentVal
    ),

    publishTag: currentVal => input(
        'Specify release tag with which you package will be published',
        currentVal
    ),

    confirm: currentVal => confirm(
        'Do you want manually confirm publishing?',
        currentVal
    )
};


function getCurrentOpts (rcFile) {
    let optsFromFile = null;

    try {
        optsFromFile = JSON.parse(readFile(rcFile).toString());
    }
    catch (err) {
        optsFromFile = {};
    }

    return defaults({}, optsFromFile, DEFAULT_OPTIONS);
}

function configureOptsObject (obj, configurators, optType) {
    return Object.keys(configurators).reduce((chain, prop) => {
        return chain
            .then(() => {
                console.log(chalk.blue(`-- Configuring ${optType} "${prop}":`));

                return configurators[prop](obj[prop]);
            })
            .then(val => {
                console.log();

                obj[prop] = val;
            });
    }, Promise.resolve());
}

function configure (opts) {
    console.log();

    return configureOptsObject(opts, optionsConfigurators, 'option')
        .then(() => configureOptsObject(opts.validations, validationConfigurators, 'validation'))
        .then(() => {
            console.log(chalk.green('-- Current configuration:'));
            console.log();
            console.log(JSON.stringify(opts, null, 2));
            console.log();

            return confirm('Is this OK?', true);
        })
        .then(yes => !yes && configure(opts));
}

module.exports = function (projectDir) {
    const rcFile = pathJoin(projectDir || process.cwd(), '.publishrc');
    const opts   = getCurrentOpts(rcFile);

    return configure(opts)
        .then(() => writeFile(rcFile, JSON.stringify(opts, null, 2)))
        .then(() => console.log('Configuration has been successfully saved.'))
        .catch(err => console.log(chalk.red('ERROR: \n') + err.stack));
};
