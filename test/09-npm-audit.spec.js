'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
const copy = require('./utils/copy-file-sync');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;
const del = require('del');
const audit = require('../lib/utils/npm-audit');

describe('npm audit analyzer', () => {
    let originalWorkingDirectory;

    before(() => (originalWorkingDirectory = process.cwd()));
    afterEach(() => process.chdir(originalWorkingDirectory));
    after(() => console.log(`cwd is restored to: ${process.cwd()}`));
    it('Cannot audit a project without a lockfile', () => {
        // Given
        mkdirp('test/tmp/audit');
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));

        // When
        return (
            Promise.resolve()
                .then(() => audit(projectDir))

                // Then
                .then((result) => {
                    result.error.summary.should.containEql(
                        'Cannot audit a project without a lockfile'
                    );
                })
        );
    });
});
