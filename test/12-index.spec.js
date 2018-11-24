'use strict';

/* eslint-disable no-unused-vars */
const readFile = require('fs').readFileSync;
const writeFile = require('fs').writeFileSync;
const should = require('should');
const cli = require('../lib');
const pathJoin = require('path').join;
const pathSeparator = require('path').sep;
const packageName = require('./utils/publish-please-version-under-test');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const lineSeparator = '----------------------------------';

/** !!!!!!!!!!!!!!!!!!!!!! WARNING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * These tests runs publish-please code on publish-please repo itself
 * These tests relies on the content of the .publishrc file located in the project root folder
 * Modifying this .publishrc file might create a test that loops for eternity
 * The publishing tests MUST always fail to ensure there will never be a real publish to npm during a test run
 */
describe('Publish-please CLI Options', () => {
    let originalWorkingDirectory;
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;
    let originalConfiguration;
    let originalArgv;

    before(() => {
        originalWorkingDirectory = process.cwd();
        originalConfiguration = JSON.parse(readFile('.publishrc').toString());
    });
    after(() => {
        writeFile('.publishrc', JSON.stringify(originalConfiguration, null, 2));
        console.log(`cwd is restored to: ${process.cwd()}`);
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        process.env.PUBLISH_PLEASE_TEST_MODE = true;
        exitCode = undefined;
        output = '';
        nativeExit = process.exit;
        nativeConsoleLog = console.log;
        process.exit = (val) => {
            // nativeConsoleLog(val);
            if (exitCode === undefined) exitCode = val;
        };
        console.log = (p1, p2) => {
            p2 === undefined ? nativeConsoleLog(p1) : nativeConsoleLog(p1, p2);
            output = output + p1;
        };

        originalArgv = process.argv.map((arg) => arg);

        // patch the .publishrc file to make sure publishing will fail
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.prePublishScript =
            "echo 'npm test started by publish-please'";
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));
    });
    afterEach(() => {
        process.exit = nativeExit;
        console.log = nativeConsoleLog;
        delete process.env.PUBLISH_PLEASE_TEST_MODE;
        process.argv = originalArgv;

        writeFile('.publishrc', JSON.stringify(originalConfiguration, null, 2));
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Should execute dry-run workflow on `npm run publish-please --dry-run`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run"],"original":["run","publish-please","--dry-run"]}';
        // When
        return (
            cli()
                // Then
                .catch((err) => {
                    output.should.containEql('ERRORS');
                    output.should.containEql('dry mode activated');
                })
        );
    });

    it('Should execute dry-run workflow with no errors on `npm run publish-please --dry-run`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run"],"original":["run","publish-please","--dry-run"]}';
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));

        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                })
        );
    });

    it('Should execute dry-run workflow with no errors on `npm run publish-please --dry-run --ci`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run", "--ci"],"original":["run","publish-please","--dry-run", "--ci"]}';
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));
        const projectName = process
            .cwd()
            .split(pathSeparator)
            .pop();
        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                    output.should.containEql(
                        `${projectName} is safe to be published`
                    );
                })
        );
    });

    it('Should execute publish workflow with no errors on `npm run publish-please --ci`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please", "--ci"],"original":["run","publish-please", "--ci"]}';
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        publishrc.publishCommand = "echo 'npm publish'";
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));

        const projectName = process
            .cwd()
            .split(pathSeparator)
            .pop();

        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.not.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                    output.should.containEql(
                        `${projectName} has been successfully published`
                    );
                })
        );
    });

    it('Should execute dry-run workflow with errors on `npx publish-please --dry-run`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--dry-run'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            '--dry-run',
        ];
        // When
        return (
            cli()
                // Then
                .catch((err) => {
                    output.should.containEql('dry mode activated');
                    output.should.containEql('ERRORS');
                })
        );
    });

    it('Should execute dry-run workflow with no errors on `npx publish-please --dry-run`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--dry-run'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            '--dry-run',
        ];
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));
        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                })
        );
    });

    it('Should execute dry-run workflow with no errors on `npx publish-please --dry-run --ci`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--dry-run'
        //   '--ci'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            '--dry-run',
            '--ci',
        ];
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));

        const projectName = process
            .cwd()
            .split(pathSeparator)
            .pop();

        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                    output.should.containEql(
                        `${projectName} is safe to be published`
                    );
                })
        );
    });

    it('Should execute publishing workflow on `npx publish-please`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--dry-run'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
        ];

        // When
        return (
            cli()
                // Then
                .catch((err) => {
                    output.should.not.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    output.should.containEql('Running validations');
                    output.should.containEql('ERRORS');
                })
        );
    });

    it('Should execute publish workflow with no errors on `npx publish-please --ci`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--ci'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            '--ci',
        ];
        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm = false;
        publishrc.validations.vulnerableDependencies = false;
        // prettier-ignore
        nodeInfos.npmPackHasJsonReporter
            ? publishrc.validations.sensitiveData = true
            : publishrc.validations.sensitiveData = false;
        publishrc.validations.uncommittedChanges = false;
        publishrc.validations.untrackedFiles = false;
        publishrc.validations.gitTag = false;
        publishrc.validations.branch = false;
        publishrc.publishCommand = "echo 'npm publish'";
        writeFile('.publishrc', JSON.stringify(publishrc, null, 2));

        const projectName = process
            .cwd()
            .split(pathSeparator)
            .pop();

        // When
        return (
            cli()
                // Then
                .then(() => {
                    output.should.not.containEql('ERRORS');
                    output.should.not.containEql('dry mode activated');
                    output.should.containEql('Running pre-publish script');
                    nodeInfos.npmPackHasJsonReporter
                        ? output.should.containEql('Running validations')
                        : output.should.not.containEql('Running validations');
                    output.should.containEql('Release info');
                    output.should.containEql(
                        `${projectName} has been successfully published`
                    );
                })
        );
    });

    it('Should execute configuration workflow on `npx publish-please config`', () => {
        // Given
        process.env['npm_config_argv'] = undefined;

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   'config'
        // ]
        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            'config',
        ];
        // When
        return cli().then(() => {
            output.should.containEql('Configuring option "prePublishScript":');
            output.should.containEql('Configuring option "postPublishScript":');
            output.should.containEql('Configuring option "publishCommand":');
            output.should.containEql('Configuring option "publishTag"');
            output.should.containEql('Configuring option "confirm":');
            output.should.containEql(
                'Configuring validation "vulnerableDependencies"'
            );
            output.should.containEql(
                'Configuring validation "uncommittedChanges":'
            );
            output.should.containEql(
                'Configuring validation "untrackedFiles":'
            );
            output.should.containEql('Configuring validation "sensitiveData":');
            output.should.containEql('Configuring validation "branch":');
            output.should.containEql('Configuring validation "gitTag"');
            output.should.containEql('Current configuration:');
            output.should.containEql(
                'Configuration has been successfully saved.'
            );
        });
    });

    it('Should execute guard on `publish-please guard`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish"],"original":["publish"]}';
        process.argv.push('guard');
        // When
        cli();
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("'npm publish' is forbidden for this package");
    });

    /**
     * This test executes against the .publishrc file in publish-please root project
     * It verifies that when you run the configuration wizard and choose all default values
     * you got the same exact configuration.
     * So be aware that changing any values in the .publishrc file will make this test fails
     */
    it('Should execute configuration wizard on `npm run publish-please config`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["config"],"cooked":["run","publish-please","config"],"original":["run","publish-please","config"]}';
        // When
        cli();
        // Then
        (exitCode || 0).should.be.equal(0);

        const publishrc = JSON.parse(readFile('.publishrc').toString());
        publishrc.confirm.should.be.true();
        publishrc.prePublishScript.should.equal(
            "echo 'npm test started by publish-please'"
        );
        publishrc.postPublishScript.should.equal('');
        publishrc.publishCommand.should.equal('npm publish');
        publishrc.publishTag.should.equal('latest');
        publishrc.validations.branch.should.equal('master');
        publishrc.validations.uncommittedChanges.should.be.true();
        publishrc.validations.untrackedFiles.should.be.true();
        publishrc.validations.vulnerableDependencies.should.be.true();
        publishrc.validations.sensitiveData.should.be.true();
        publishrc.validations.gitTag.should.be.true();
        publishrc.validations.branch.should.equal('master');
    });
});
