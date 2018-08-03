'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const validation = require('../lib/validations/vulnerable-dependencies');
const requireUncached = require('import-fresh');
const showValidationErrors = require('../lib/utils/show-validation-errors');
const lineSeparator = '----------------------------------';

describe('Vulnerability validation when npm is < 6', () => {
    let nativeCanRun;

    before(() => {
        nativeCanRun = validation.canRun;
        validation.canRun = () => false;
        return Promise.resolve();
    });
    after(() => {
        validation.canRun = nativeCanRun;
        return Promise.resolve();
    });
    beforeEach(() =>
        console.log(`${lineSeparator} begin test ${lineSeparator}`));
    afterEach(() =>
        console.log(`${lineSeparator} end test ${lineSeparator}\n`));

    it('Should default to false when there is no configuration file', () => {
        // Given all validations are loaded
        const validations = requireUncached('../lib/validations');

        // When
        const defaultParam = validations.DEFAULT_OPTIONS[validation.option];

        // Then
        defaultParam.should.be.false();
    });
    it('Should run with an error message when validation is enabled in configuration file', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql(
                        'Cannot check vulnerable dependencies'
                    );
                })
        );
    });
    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: false,
        };
        // When
        return validations.validate(opts);

        // Then nothing executes
    });
});

describe('Vulnerability validation when npm is >= 6', () => {
    let nativeCanRun;

    before(() => {
        nativeCanRun = validation.canRun;
        validation.canRun = () => true;
        return Promise.resolve();
    });
    after(() => {
        validation.canRun = nativeCanRun;
        return Promise.resolve();
    });
    beforeEach(() =>
        console.log(`${lineSeparator} begin test ${lineSeparator}`));
    afterEach(() =>
        console.log(`${lineSeparator} end test ${lineSeparator}\n`));

    it('Should default to true when there is no configuration file', () => {
        // Given all validations are loaded
        const validations = requireUncached('../lib/validations');

        // When
        const defaultParam = validations.DEFAULT_OPTIONS[validation.option];

        // Then
        defaultParam.should.be.true();
    });
    it('Should run with no error message when validation is enabled in configuration file and there is no vulnerability', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const pkgInfo = {
            cfg: {
                dependencies: {},
            },
        };

        // When
        return validations.validate(opts, pkgInfo);
        // Then validation pass without error
    });
    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: false,
        };
        const pkgInfo = {
            cfg: {
                dependencies: {
                    ms: '0.7.0', // vunerable dependency
                },
            },
        };

        // When
        return validations.validate(opts, pkgInfo);

        // Then nothing executes
    });

    ['publish-please@2.4.1', 'testcafe@0.19.2', 'ms@0.7.0'].forEach(function(
        dependency
    ) {
        const packageName = dependency.split('@')[0];
        const packageVersion = dependency.split('@')[1];
        it(`Should report vulnerability on '${dependency}' dependency when validation is enabled in configuration file`, () => {
            // Given validation is enabled in configuration file
            const validations = requireUncached('../lib/validations');
            const opts = {
                vulnerableDependencies: true,
            };
            const pkgInfo = {
                cfg: {
                    dependencies: {},
                },
            };
            pkgInfo.cfg.dependencies[`${packageName}`] = `${packageVersion}`;
            // When
            return (
                validations
                    .validate(opts, pkgInfo)
                    // Then
                    .then(() => {
                        throw new Error('Promise rejection expected');
                    })
                    .catch((err) => {
                        showValidationErrors(err);
                        err.message.should.containEql('Vulnerability found in');
                        err.message.should.containEql(`${dependency}`);
                    })
            );
        });
    });
});
