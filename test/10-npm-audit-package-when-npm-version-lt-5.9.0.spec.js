'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;
const del = require('del');
const auditPackage = require('../lib/utils/npm-audit-package');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const writeFile = require('fs').writeFileSync;
const showValidationErrors = require('../lib/utils/show-validation-errors');
const lineSeparator = '----------------------------------';

if (!nodeInfos.npmPackHasJsonReporter) {
    describe('npm package analyzer when npm is < 5.9.0', () => {
        let originalWorkingDirectory;
        let projectDir;

        before(() => {
            originalWorkingDirectory = process.cwd();
            projectDir = pathJoin(__dirname, 'tmp', 'pack02');
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
        it('Cannot audit a package on npm < 5.9.0', () => {
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
                    .then(() => {
                        throw new Error('Promise rejection expected');
                    })
                    .catch((err) => {
                        showValidationErrors(err);
                        err.message.should.containEql('Unexpected token');
                        err.message.should.containEql('in JSON at position');
                    })
            );
        });
    });
}
