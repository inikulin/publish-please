'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const pathJoin = require('path').join;
const mkdirp = require('mkdirp');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const EOL = require('os').EOL;
const audit = require('../lib//utils/npm-audit');
const lineSeparator = '----------------------------------';

describe('npm audit analyzer', () => {
    let originalWorkingDirectory;
    before(() => {
        originalWorkingDirectory = process.cwd();
        mkdirp('test/tmp/audit');
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '.auditignore'));
    });
    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Should handle errors when auto-generated package-lock.json cannot be deleted', () => {
        // Given
        const projectDir = null;
        const response = {
            yo: 123,
            actions: ['yo123'],
            vulnerabilities: {
                '777': {
                    yo: 123,
                },
            },
        };

        // When
        const result = audit.removePackageLockFrom(projectDir, response);

        // Then
        result.should.containDeep(response);
        Array.isArray(result.internalErrors).should.be.true();
        result.internalErrors[0].should.be.Error();
    });

    it('Should handle errors when removing ignored vulnerabilities', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditIgnore = ['https://nodesecurity.io/advisories/46'];
        writeFile(pathJoin(projectDir, '.auditignore'), auditIgnore.join(EOL));

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        const response = {
            actions: null,
            vulnerabilities: null,
        };

        // When
        const result = audit.removeIgnoredVulnerabilities(response, options);

        // Then
        result.should.containDeep(response);
        Array.isArray(result.internalErrors).should.be.true();
        result.internalErrors[0].should.be.Error();
    });

    it('Should handle errors when removing ignored vulnerabilities but response is null', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditIgnore = ['https://nodesecurity.io/advisories/46'];
        writeFile(pathJoin(projectDir, '.auditignore'), auditIgnore.join(EOL));

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        const response = null;

        // When
        const result = audit.removeIgnoredVulnerabilities(response, options);

        // Then
        (result === response).should.be.true();
    });
});
