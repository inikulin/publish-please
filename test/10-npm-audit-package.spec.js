'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;
const del = require('del');
const auditPackage = require('../lib/utils/npm-audit-package');
const writeFile = require('fs').writeFileSync;
const lineSeparator = '----------------------------------';

describe('npm package analyzer', () => {
    let originalWorkingDirectory;
    let projectDir;

    before(() => {
        originalWorkingDirectory = process.cwd();
        projectDir = pathJoin(__dirname, 'tmp', 'pack01');
        mkdirp.sync(projectDir);
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '*.tgz'));
    });
    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    after(() => console.log(`cwd is restored to: ${process.cwd()}`));
    it('Can audit package', () => {
        // Given
        const pkg = {
            name: 'testing-repo',
            version: '0.0.0',
            scripts: {},
        };
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkg, null, 2)
        );

        // When
        return (
            Promise.resolve()
                .then(() => auditPackage(projectDir))

                // Then
                .then((result) => {
                    const expected = {
                        id: 'testing-repo@0.0.0',
                        name: 'testing-repo',
                        version: '0.0.0',
                        filename: 'testing-repo-0.0.0.tgz',
                        files: [
                            {
                                path: 'package.json',
                                size: 67,
                                mode: 420,
                            },
                        ],
                        entryCount: 1,
                        bundled: [],
                    };
                    result.should.containDeep(expected);
                })
        );
    });
});
