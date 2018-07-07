'use strict';

/* eslint-disable no-unused-vars */
const readFile = require('fs').readFileSync;
const should = require('should');
const cli = require('../lib');
const pathJoin = require('path').join;

describe('Publish-please CLI Options', () => {
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;
    let hasAddedArg;

    beforeEach(() => {
        hasAddedArg = false;
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
    });
    afterEach(() => {
        process.exit = nativeExit;
        console.log = nativeConsoleLog;
        delete process.env.PUBLISH_PLEASE_TEST_MODE;
        if (hasAddedArg) {
            process.argv.pop();
        }
    });

    /** !!!!!!!!!!!!!!!!!!!!!! WARNING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
     * This test runs publish-please code on publish-please repo itself
     * This test relies on the content of the .publishrc file located in the project root folder
     * Modifying this .publishrc file might create a test that loops for eternity
     * This test must always fail to ensure there will never be a real publish to npm
     */
    it('Should execute dry-run workflow on `npm run publish-please --dry-run`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run"],"original":["run","publish-please","--dry-run"]}';
        // When
        return (
            cli()
                // Then
                .catch((err) => err.message.should.containEql('ERRORS'))
                .catch((err) => output.should.containEql('dry mode activated'))
        );
    });

    it('Should execute dry-run workflow on `npx publish-please --dry-run`', () => {
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
                .catch((err) => err.message.should.containEql('ERRORS'))
                .catch((err) => output.should.containEql('dry mode activated'))
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
        hasAddedArg = true;
        // When
        cli();
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("'npm publish' is forbidden for this package");
    });

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
        publishrc.prePublishScript.should.equal("echo 'npm test'");
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
