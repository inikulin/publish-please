'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const del = require('del');
const pathJoin = require('path').join;
const writeFile = require('fs').writeFileSync;
const validation = require('../lib/validations/sensitive-data');
const requireUncached = require('import-fresh');
const showValidationErrors = require('../lib/utils/show-validation-errors');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const chalk = require('chalk');
const lineSeparator = '----------------------------------';

describe('Sensitive data validation when npm is < 5.9.0', () => {
    let nativeCanRun;
    before(() => {
        nativeCanRun = validation.canRun;
        validation.canRun = () => false;
    });
    after(() => {
        validation.canRun = nativeCanRun;
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
            sensitiveData: true,
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
                        'Cannot check sensitive and non-essential data'
                    );
                })
        );
    });

    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            sensitiveData: false,
        };
        // When
        return validations.validate(opts);

        // Then nothing executes
    });
});

describe('Sensitive data validation when npm is >= 5.9.0', () => {
    let nativeCanRun;
    let originalWorkingDirectory;
    let projectDir;
    before(() => {
        originalWorkingDirectory = process.cwd();
        projectDir = pathJoin(__dirname, 'tmp', 'pack04');
        mkdirp.sync(projectDir);
        nativeCanRun = validation.canRun;
        validation.canRun = () => true;
    });
    after(() => {
        validation.canRun = nativeCanRun;
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));

        process.chdir(projectDir);
    });

    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Should default to true when there is no configuration file', () => {
        // Given all validations are loaded
        const validations = requireUncached('../lib/validations');

        // When
        const defaultParam = validations.DEFAULT_OPTIONS[validation.option];

        // Then
        defaultParam.should.be.true();
    });

    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            sensitiveData: false,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                version: '0.0.0',
                scripts: {},
            },
        };
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );

        // When
        return validations.validate(opts, pkgInfo);

        // Then nothing executes
    });
});
