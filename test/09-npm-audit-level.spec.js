'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;
const del = require('del');
const audit = require('../lib/utils/npm-audit');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const writeFile = require('fs').writeFileSync;

const lineSeparator = '----------------------------------';

if (nodeInfos.npmAuditHasJsonReporter) {
    describe('npm audit level', () => {
        let originalWorkingDirectory;
        let projectDir;

        before(() => {
            originalWorkingDirectory = process.cwd();
            projectDir = pathJoin(__dirname, 'tmp', 'audit01');
            mkdirp.sync(projectDir);
        });
        beforeEach(() => {
            console.log(`${lineSeparator} begin test ${lineSeparator}`);
            del.sync(pathJoin(projectDir, 'package.json'));
            del.sync(pathJoin(projectDir, 'package-lock.json'));
            del.sync(pathJoin(projectDir, '.auditignore'));
            del.sync(pathJoin(projectDir, 'audit.opts'));
        });
        afterEach(() => {
            process.chdir(originalWorkingDirectory);
            console.log(`${lineSeparator} end test ${lineSeparator}\n`);
        });

        it('Should not report "moderate" vulnerability on ms@0.7.0 dependency when audit level is set to "high" ', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            const auditOptions = `
                --debug
                --audit-level = high  
                --json
        `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [],
                            advisories: {},
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 0,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 1,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 1,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });
    });
}
