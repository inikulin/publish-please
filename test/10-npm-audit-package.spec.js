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
});
