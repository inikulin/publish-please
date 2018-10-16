'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const pathJoin = require('path').join;
const mkdirp = require('mkdirp');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const EOL = require('os').EOL;
const audit = require('../lib/utils/npm-audit-package');
const lineSeparator = '----------------------------------';

describe('npm package analyzer', () => {
    let originalWorkingDirectory;
    let projectDir;
    before(() => {
        originalWorkingDirectory = process.cwd();
        projectDir = pathJoin(__dirname, 'tmp', 'pack03');
        mkdirp.sync(projectDir);
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '.publishrc'));
    });
    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    after(() => console.log(`cwd is restored to: ${process.cwd()}`));
    it('Should get default list of sensitiva data', () => {
        // Given

        // When
        const result = audit.getDefaultSensitiveData();

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(1);
    });

    it('Should get no ignored files when publish-please has no configuration file', () => {
        // Given
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(0);
    });

    it('Should get no ignored files from publish-please configuration file is not a valid json file', () => {
        // Given
        const config = '<bad json>';
        writeFile(pathJoin(projectDir, '.publishrc'), config);
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(0);
    });

    it('Should get ignored files from publish-please configuration file', () => {
        // Given
        const config = {
            validations: {
                sensitiveData: {
                    ignore: ['*.json', '*.txt'],
                },
            },
            confirm: true,
            publishCommand: 'npm publish',
            publishTag: 'latest',
            postPublishScript: false,
        };
        writeFile(
            pathJoin(projectDir, '.publishrc'),
            JSON.stringify(config, null, 2)
        );
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        const expected = ['*.json', '*.txt'];
        Array.isArray(result).should.be.true();
        result.length.should.equal(2);
        result.should.containDeep(expected);
    });

    it('Should get no ignored files from publish-please configuration file when ignore section is empty', () => {
        // Given
        const config = {
            validations: {
                sensitiveData: {
                    ignore: [],
                },
            },
            confirm: true,
            publishCommand: 'npm publish',
            publishTag: 'latest',
            postPublishScript: false,
        };
        writeFile(
            pathJoin(projectDir, '.publishrc'),
            JSON.stringify(config, null, 2)
        );
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(0);
    });

    it('Should get no ignored files from publish-please configuration file when validation is disabled', () => {
        // Given
        const config = {
            validations: {
                sensitiveData: false,
            },
            confirm: true,
            publishCommand: 'npm publish',
            publishTag: 'latest',
            postPublishScript: false,
        };
        writeFile(
            pathJoin(projectDir, '.publishrc'),
            JSON.stringify(config, null, 2)
        );
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(0);
    });

    it('Should get no ignored files from publish-please configuration file when validation is enabled by default', () => {
        // Given
        const config = {
            validations: {
                sensitiveData: true,
            },
            confirm: true,
            publishCommand: 'npm publish',
            publishTag: 'latest',
            postPublishScript: false,
        };
        writeFile(
            pathJoin(projectDir, '.publishrc'),
            JSON.stringify(config, null, 2)
        );
        const options = audit.getDefaultOptionsFor(projectDir);
        // When
        const result = audit.getIgnoredSensitiveData(options);

        // Then
        Array.isArray(result).should.be.true();
        result.length.should.equal(0);
    });

    it('Should do nothing if the package has no file in it', () => {
        // Given
        const npmPackResponse = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: [],
            entryCount: 0,
            bundled: [],
        };
        // When
        const result = audit.addSensitiveDataInfosIn(npmPackResponse);

        // Then
        result.should.containDeep(npmPackResponse);
        Array.isArray(result.files).should.be.true();
        result.files.length.should.equal(0);
    });

    it('Should do nothing if the package has `undefined` files', () => {
        // Given
        const npmPackResponse = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: undefined,
            entryCount: 0,
            bundled: [],
        };
        // When
        const result = audit.addSensitiveDataInfosIn(npmPackResponse);

        // Then
        result.should.containDeep(npmPackResponse);
        Array.isArray(result.files).should.be.false();
        (result.files === undefined).should.be.true();
    });

    it('Should add sensitiva data info on package.json file', () => {
        // Given
        const npmPackResponse = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: [
                {
                    path: 'package.json',
                    size: 67,
                },
            ],
            entryCount: 1,
            bundled: [],
        };
        // When
        const result = audit.addSensitiveDataInfosIn(npmPackResponse);

        // Then
        const expected = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: [
                {
                    path: 'package.json',
                    size: 67,
                    isSensitiveData: false,
                },
            ],
            entryCount: 1,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on tar file', () => {
        // Given
        const npmPackResponse = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: [
                {
                    path: 'package.json',
                    size: 67,
                },
                {
                    path: 'publish-please.tgz',
                    size: 123456,
                },
            ],
            entryCount: 2,
            bundled: [],
        };
        // When
        const result = audit.addSensitiveDataInfosIn(npmPackResponse);

        // Then
        const expected = {
            id: 'testing-repo@0.0.0',
            name: 'testing-repo',
            version: '0.0.0',
            filename: 'testing-repo-0.0.0.tgz',
            files: [
                {
                    path: 'package.json',
                    size: 67,
                    isSensitiveData: false,
                },
                {
                    path: 'publish-please.tgz',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 2,
            bundled: [],
        };
        result.should.containDeep(expected);
    });
});