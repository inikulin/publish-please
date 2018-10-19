'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const del = require('del');
const pathJoin = require('path').join;
const writeFile = require('fs').writeFileSync;
const validation = require('../lib/validations/vulnerable-dependencies');
const requireUncached = require('import-fresh');
const showValidationErrors = require('../lib/utils/show-validation-errors');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const chalk = require('chalk');
const lineSeparator = '----------------------------------';

describe('Vulnerability validation when npm is < 6.1.0', () => {
    let nativeCanRun;
    before(() => {
        nativeCanRun = validation.canRun;
        validation.canRun = () => false;
    });
    after(() => {
        validation.canRun = nativeCanRun;
    });
    beforeEach(() =>
        console.log(`${lineSeparator} begin test ${lineSeparator}`));
    afterEach(() =>
        console.log(`${lineSeparator} end test ${lineSeparator}\n`));

    it('Should default to false when there is no configuration file', () => {
        // Given all validations are loaded
        const validations = requireUncached('../lib/validations');

        // When
        const defaultParam = validations.DEFAULT_OPTIONS[validation.option];

        // Then
        defaultParam.should.be.false();
    });
    it('Should run with an error message when validation is enabled in configuration file', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql(
                        'Cannot check vulnerable dependencies'
                    );
                })
        );
    });
    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: false,
        };
        // When
        return validations.validate(opts);

        // Then nothing executes
    });
});

describe('Vulnerability validation when npm is >= 6.1.0', () => {
    let nativeCanRun;
    let originalWorkingDirectory;
    let projectDir;
    before(() => {
        originalWorkingDirectory = process.cwd();
        projectDir = pathJoin(__dirname, 'tmp', 'audit05');
        mkdirp.sync(projectDir);
        nativeCanRun = validation.canRun;
        validation.canRun = () => true;
    });
    after(() => {
        validation.canRun = nativeCanRun;
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '.auditignore'));
        del.sync(pathJoin(projectDir, 'audit.opts'));
        process.chdir(projectDir);
    });

    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Should default to true when there is no configuration file', () => {
        // Given all validations are loaded
        const validations = requireUncached('../lib/validations');

        // When
        const defaultParam = validations.DEFAULT_OPTIONS[validation.option];

        // Then
        defaultParam.should.be.true();
    });
    it('Should run with no error message when npm >= 6.1.0 and validation is enabled in configuration file and there is no vulnerability', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                dependencies: {},
            },
        };
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );

        // When
        return (
            validations
                .validate(opts, pkgInfo)
                // Then validation pass without error
                .catch((err) => {
                    showValidationErrors(err);
                    if (nodeInfos.npmAuditHasJsonReporter) {
                        throw new Error('Promise rejection not expected');
                    }
                })
        );
    });
    it('Should not run when validation is disabled in configuration file', () => {
        // Given validation is disabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: false,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0', // vunerable dependency
                },
            },
        };
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );

        // When
        return validations.validate(opts, pkgInfo);

        // Then nothing executes
    });

    it("Should report transitive vulnerabilities on 'publish-please@2.4.1' dependency when validation is enabled in configuration file", () => {
        // Given validation is enabled in configuration file
        const dependency = 'publish-please@2.4.1';
        const packageName = dependency.split('@')[0];
        const packageVersion = dependency.split('@')[1];
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                dependencies: {},
            },
        };
        pkgInfo.cfg.dependencies[`${packageName}`] = `${packageVersion}`;
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );
        // When
        return (
            validations
                .validate(opts, pkgInfo)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    if (nodeInfos.npmAuditHasJsonReporter) {
                        err.message.should.containEql('Vulnerability found in');
                        err.message.should.containEql(`${packageName}`);
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('lodash')}`
                        );
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('https-proxy-agent')}`
                        );
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('hoek')}`
                        );
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('moment')}`
                        );
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('deep-extend')}`
                        );
                        return;
                    }

                    err.message.should.containEql('Command failed: npm audit ');
                })
        );
    });

    it("Should report vulnerability on 'ms@0.7.0' as direct dependency when validation is enabled in configuration file", () => {
        // Given validation is enabled in configuration file
        const dependency = 'ms@0.7.0';
        const packageName = dependency.split('@')[0];
        const packageVersion = dependency.split('@')[1];
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                dependencies: {},
            },
        };
        pkgInfo.cfg.dependencies[`${packageName}`] = `${packageVersion}`;
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );
        // When
        return (
            validations
                .validate(opts, pkgInfo)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    if (nodeInfos.npmAuditHasJsonReporter) {
                        err.message.should.containEql('Vulnerability found in');
                        err.message.should.containEql(`${packageName}`);
                        err.message.should.containEql(
                            `${chalk.red.bold('ms')}`
                        );
                        err.message.should.not.containEql('->');
                        return;
                    }

                    err.message.should.containEql('Command failed: npm audit ');
                })
        );
    });

    it("Should report vulnerability on 'testcafe@0.19.2' dependency when validation is enabled in configuration file", () => {
        // Given validation is enabled in configuration file
        const dependency = 'testcafe@0.19.2';
        const packageName = dependency.split('@')[0];
        const packageVersion = dependency.split('@')[1];
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const pkgInfo = {
            cfg: {
                name: 'testing-repo',
                dependencies: {},
            },
        };
        pkgInfo.cfg.dependencies[`${packageName}`] = `${packageVersion}`;
        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkgInfo.cfg, null, 2)
        );
        // When
        return (
            validations
                .validate(opts, pkgInfo)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    if (nodeInfos.npmAuditHasJsonReporter) {
                        err.message.should.containEql('Vulnerability found in');
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('lodash')}`
                        );
                        err.message.should.containEql(
                            `-> ${chalk.red.bold('atob')}`
                        );
                        err.message.should.containEql(`${packageName}`);
                        return;
                    }

                    err.message.should.containEql('Command failed: npm audit ');
                })
        );
    });
});

describe('Vulnerability validation', () => {
    let nativeCanRun;
    let nativeProcessCwd;
    let nativeProcessChdir;
    let nativeJsonParse;

    before(() => {
        nativeCanRun = validation.canRun;
        validation.canRun = () => true;
        nativeProcessCwd = process.cwd;
        nativeProcessChdir = process.chdir;
        nativeJsonParse = JSON.parse;
    });
    after(() => {
        validation.canRun = nativeCanRun;
        process.cwd = nativeProcessCwd;
        process.chdir = nativeProcessChdir;
        JSON.parse = nativeJsonParse;
    });
    beforeEach(() =>
        console.log(`${lineSeparator} begin test ${lineSeparator}`));
    afterEach(() => {
        process.cwd = nativeProcessCwd;
        process.chdir = nativeProcessChdir;
        JSON.parse = nativeJsonParse;
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Should catch the error when validation throws an error', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const uncaughtErrorMessage =
            'Uncaught error in vulnerability validation';
        process.cwd = () => {
            // should throw an error inside the validation.run() method
            throw new Error(uncaughtErrorMessage);
        };
        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql(uncaughtErrorMessage);
                })
        );
    });

    it('Should catch the error when audit analyzer throws an error', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const uncaughtErrorMessage = 'Uncaught error in npm audit analyzer';
        process.chdir = () => {
            // should throw an error inside the audit() method
            throw new Error(uncaughtErrorMessage);
        };

        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql(uncaughtErrorMessage);
                })
        );
    });

    it('Should catch the error when npm audit command fails', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const uncaughtErrorMessage = 'Uncaught error in npm audit analyzer';
        JSON.parse = () => {
            return {
                error: {
                    summary:
                        'Command failed: npm audit --json > /var/folders/by/43xfzp8n1wd6z9f5rxxbjn1m0000gn/T/npm-audit-audit.log\n',
                },
            };
        };

        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql('Command failed: npm audit');
                })
        );
    });

    it('Should catch the error when npm audit command result is not in JSON format', () => {
        // Given validation is enabled in configuration file
        const validations = requireUncached('../lib/validations');
        const opts = {
            vulnerableDependencies: true,
        };
        const jsonParseErrorMessage = 'Cannot parse JSON';
        JSON.parse = () => {
            throw new Error(jsonParseErrorMessage);
        };
        // Given there is no package-lock.json file

        // When
        return (
            validations
                .validate(opts)
                // Then
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    showValidationErrors(err);
                    err.message.should.containEql(jsonParseErrorMessage) ||
                        err.message.should.containEql(
                            'Command failed: npm audit'
                        );
                })
        );
    });
});
