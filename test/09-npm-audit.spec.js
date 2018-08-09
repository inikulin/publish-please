'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const audit = require('../lib//utils/npm-audit');
const lineSeparator = '----------------------------------';

describe('npm audit analyzer', () => {
    let originalWorkingDirectory;
    before(() => {
        originalWorkingDirectory = process.cwd();
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
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
        result.internalErrors[0].message.should.containEql(
            'The "path" argument must be of type string'
        );
    });
});
