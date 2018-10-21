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

    /**
     * this test is a guard against changes in the .sensitive-data file.
     * Any changes to this file will make this test failed
     */
    it('Should get default list of sensitiva data', () => {
        // Given

        // When
        const result = audit.getDefaultSensitiveData();

        // Then
        Array.isArray(result.sensitiveData).should.be.true();
        Array.isArray(result.ignoredData).should.be.true();
        result.sensitiveData.length.should.equal(30);
        result.ignoredData.length.should.equal(2);
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

    it('Should add sensitiva data info on private ssh key file _rsa', () => {
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
                    path: 'id_rsa',
                    size: 123456,
                },
                {
                    path: 'keys/yo_rsa',
                    size: 123456,
                },
                {
                    path: 'keys/foo_rsa.enc',
                    size: 123456,
                },
                {
                    path: 'keys/foo_rsa.pub',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'id_rsa',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/yo_rsa',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/foo_rsa.enc',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/foo_rsa.pub',
                    size: 123456,
                    isSensitiveData: false,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on private ssh key file _dsa', () => {
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
                    path: 'id_dsa',
                    size: 123456,
                },
                {
                    path: 'keys/yo_dsa',
                    size: 123456,
                },
                {
                    path: 'keys/foo_dsa.enc',
                    size: 123456,
                },
                {
                    path: 'keys/foo_dsa.pub',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'id_dsa',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/yo_dsa',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/foo_dsa.enc',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'keys/foo_dsa.pub',
                    size: 123456,
                    isSensitiveData: false,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on log files', () => {
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
                    path: 'yo.log',
                    size: 123456,
                },
                {
                    path: 'yo.svclog',
                    size: 123456,
                },
                {
                    path: 'logs/yo',
                    size: 123456,
                },
                {
                    path: 'lib/logs/yo',
                    size: 123456,
                },
                {
                    path: 'lib/yo.svclog',
                    size: 123456,
                },
                {
                    path: 'lib/UpgradeLog-my-project.XML',
                    size: 123456,
                },
                {
                    path: 'lib/foo.binlog',
                    size: 123456,
                },
            ],
            entryCount: 8,
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
                    path: 'yo.log',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'yo.svclog',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'logs/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/logs/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/yo.svclog',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/UpgradeLog-my-project.XML',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/foo.binlog',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 8,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on eslint configuration files', () => {
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
                    path: '.eslintrc',
                    size: 123456,
                },
                {
                    path: '.eslintrc.json',
                    size: 123456,
                },
                {
                    path: 'lib/.eslintrc.yaml',
                    size: 123456,
                },
                {
                    path: 'lib/.eslintrc.yml',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: '.eslintrc',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: '.eslintrc.json',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/.eslintrc.yaml',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/.eslintrc.yml',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on temp files (tmp)', () => {
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
                    path: 'tmp/yo',
                    size: 123456,
                },
                {
                    path: 'tmp/yo.123',
                    size: 123456,
                },
                {
                    path: 'lib/tmp/yo',
                    size: 123456,
                },
                {
                    path: 'lib/tmp/yo.123',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'tmp/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'tmp/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/tmp/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/tmp/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on temp files (temp)', () => {
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
                    path: 'temp/yo',
                    size: 123456,
                },
                {
                    path: 'temp/yo.123',
                    size: 123456,
                },
                {
                    path: 'lib/temp/yo',
                    size: 123456,
                },
                {
                    path: 'lib/temp/yo.123',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'temp/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'temp/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/temp/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/temp/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on test files (test)', () => {
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
                    path: 'test/yo',
                    size: 123456,
                },
                {
                    path: 'test/yo.123',
                    size: 123456,
                },
                {
                    path: 'lib/test/yo',
                    size: 123456,
                },
                {
                    path: 'lib/test/yo.123',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'test/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'test/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/test/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/test/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on test files (tests)', () => {
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
                    path: 'tests/yo',
                    size: 123456,
                },
                {
                    path: 'tests/yo.123',
                    size: 123456,
                },
                {
                    path: 'lib/tests/yo',
                    size: 123456,
                },
                {
                    path: 'lib/tests/yo.123',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'tests/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'tests/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/tests/yo',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/tests/yo.123',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });

    it('Should add sensitiva data info on test files (*.spec.*)', () => {
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
                    path: 'yo.spec.js',
                    size: 123456,
                },
                {
                    path: 'yo.spec.ts',
                    size: 123456,
                },
                {
                    path: 'lib/yo.spec.js',
                    size: 123456,
                },
                {
                    path: 'lib/yo.spec.ts',
                    size: 123456,
                },
            ],
            entryCount: 5,
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
                    path: 'yo.spec.js',
                    size: 123456,
                },
                {
                    path: 'yo.spec.ts',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/yo.spec.js',
                    size: 123456,
                    isSensitiveData: true,
                },
                {
                    path: 'lib/yo.spec.ts',
                    size: 123456,
                    isSensitiveData: true,
                },
            ],
            entryCount: 5,
            bundled: [],
        };
        result.should.containDeep(expected);
    });
});
