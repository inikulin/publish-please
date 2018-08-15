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
        mkdirp.sync('test/tmp/audit');
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '.auditignore'));
        del.sync(pathJoin(projectDir, 'audit.opts'));
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

    it('Should set audit-level option to low when there is no audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': 'low',
        };
        result.should.containDeep(expected);
    });

    it('Should set audit-level option to low when audit.opts file is empty', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `

        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': 'low',
        };
        result.should.containDeep(expected);
    });

    [
        audit.auditLevel.low,
        audit.auditLevel.moderate,
        audit.auditLevel.high,
        audit.auditLevel.critical,
    ].forEach((auditLevel) => {
        it(`Should get '--audit-level=${auditLevel}'  option set in audit.opts file`, () => {
            // Given
            const projectDir = pathJoin(__dirname, 'tmp', 'audit');
            const auditOptions = `
                --debug
                --audit-level = ${auditLevel}  
                --json
            `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            const options = {
                directoryToAudit: projectDir,
                auditLogFilepath: pathJoin(projectDir, 'audit.log'),
                createLockLogFilepath: pathJoin(
                    projectDir,
                    'create-package-lock.log'
                ),
            };

            // When
            const result = audit.getNpmAuditOptions(options);

            // Then
            const expected = {
                '--audit-level': auditLevel,
            };
            result.should.containDeep(expected);
        });
    });

    [
        audit.auditLevel.low,
        audit.auditLevel.moderate,
        audit.auditLevel.high,
        audit.auditLevel.critical,
    ].forEach((auditLevel) => {
        it(`Should get '--audit-level ${auditLevel}'  option set in audit.opts file`, () => {
            // Given
            const projectDir = pathJoin(__dirname, 'tmp', 'audit');
            const auditOptions = `
                --debug
                --audit-level  ${auditLevel}  
                --json
            `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            const options = {
                directoryToAudit: projectDir,
                auditLogFilepath: pathJoin(projectDir, 'audit.log'),
                createLockLogFilepath: pathJoin(
                    projectDir,
                    'create-package-lock.log'
                ),
            };

            // When
            const result = audit.getNpmAuditOptions(options);

            // Then
            const expected = {
                '--audit-level': auditLevel,
            };
            result.should.containDeep(expected);
        });
    });

    it('Should get default audit-level option when option is set with invalid value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level = yo123  
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });

    it('Should get default audit-level option when option is set with empty value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level =   
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });

    it('Should get default audit-level option when option is set with no value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });
});
