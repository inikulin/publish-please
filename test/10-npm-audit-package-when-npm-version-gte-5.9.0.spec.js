'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const pathJoin = require('path').join;
const del = require('del');
const auditPackage = require('../lib/utils/npm-audit-package');
const writeFile = require('fs').writeFileSync;
const touch = require('./utils/touch-file-sync');

const lineSeparator = '----------------------------------';

if (nodeInfos.npmPackHasJsonReporter) {
    describe('npm package analyzer when npm is >= 5.9.0', () => {
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
            del.sync(pathJoin(projectDir, '.publishrc'));
            del.sync(pathJoin(projectDir, '*.tgz'));
            del.sync(pathJoin(projectDir, 'lib', '*.tgz'));
            del.sync(pathJoin(projectDir, 'lib', 'test', '*.tgz'));
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
                                },
                            ],
                            entryCount: 1,
                            bundled: [],
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should add sensitiva data info on files included in the package', () => {
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
            touch(pathJoin(projectDir, 'yo123.tgz'));
            mkdirp.sync(pathJoin(projectDir, 'lib'));
            touch(pathJoin(projectDir, 'lib', 'yo234.tgz'));
            mkdirp.sync(pathJoin(projectDir, 'lib', 'test'));
            touch(pathJoin(projectDir, 'lib', 'test', 'yo345.tgz'));
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
                                    isSensitiveData: false,
                                },
                                {
                                    path: 'yo123.tgz',
                                    size: 0,
                                    isSensitiveData: true,
                                },
                                {
                                    path: 'lib/yo234.tgz',
                                    size: 0,
                                    isSensitiveData: true,
                                },
                                {
                                    path: 'lib/test/yo345.tgz',
                                    size: 0,
                                    isSensitiveData: true,
                                },
                            ],
                            entryCount: 4,
                            bundled: [],
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should set ignored files as non sensitive data on files included in the package', () => {
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
            const config = {
                validations: {
                    sensitiveData: {
                        ignore: ['lib/**/*.tgz'],
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
            const npmignore = '.publishrc';
            writeFile(pathJoin(projectDir, '.npmignore'), npmignore);

            touch(pathJoin(projectDir, 'yo123.tgz'));
            mkdirp.sync(pathJoin(projectDir, 'lib'));
            touch(pathJoin(projectDir, 'lib', 'yo234.tgz'));
            mkdirp.sync(pathJoin(projectDir, 'lib', 'test'));
            touch(pathJoin(projectDir, 'lib', 'test', 'yo345.tgz'));
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
                                    isSensitiveData: false,
                                },
                                {
                                    path: 'yo123.tgz',
                                    size: 0,
                                    isSensitiveData: true,
                                },
                                {
                                    path: 'lib/yo234.tgz',
                                    size: 0,
                                    isSensitiveData: false,
                                },
                                {
                                    path: 'lib/test/yo345.tgz',
                                    size: 0,
                                    isSensitiveData: false,
                                },
                            ],
                            entryCount: 4,
                            bundled: [],
                        };
                        result.should.containDeep(expected);
                    })
            );
        });
    });
}
