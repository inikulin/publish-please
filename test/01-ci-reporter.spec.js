'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');
const reporter = require('../lib/reporters/ci-reporter');
const pathJoin = require('path').join;
const os = require('os');
const envType = require('../lib/reporters/env-type');
const icon = require('../lib/reporters/ci-icon');
const lineSeparator = '----------------------------------';

describe('CI reporter', () => {
    let nativeExit;
    let nativeConsoleLog;
    let nativeIsCI;
    let nativePlatform;
    let exitCode;
    let output;

    beforeEach(() => {
        console.log(
            `${lineSeparator} begin test - platform: ${os.platform()} ${lineSeparator}`
        );
        delete process.env.TEAMCITY_VERSION;
        exitCode = undefined;
        output = '';
        nativeExit = process.exit;
        nativeConsoleLog = console.log;
        nativeIsCI = envType.isCI;
        nativePlatform = os.platform;
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
        envType.isCI = nativeIsCI;
        os.platform = nativePlatform;
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Can run by default', () => {
        // Given

        // When
        const result = reporter.canRun();
        // Then
        result.should.be.true();
    });

    it('Should not run by default on non CI', () => {
        // Given
        envType.isCI = () => false;
        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.false();
    });

    it('Should run by default on CI', () => {
        // Given
        envType.isCI = () => true;
        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });

    it('Should detect Teamcity', () => {
        // Given
        process.env.TEAMCITY_VERSION = '1.0.0';
        // When
        const result = envType.isTeamcity();
        // Then
        result.should.be.true();
    });

    it('Should detect non Teamcity', () => {
        // Given
        delete process.env.TEAMCITY_VERSION;
        // When
        const result = envType.isTeamcity();
        // Then
        result.should.be.false();
    });

    it('Success icon on Teamcity should be [v]', () => {
        // Given
        process.env.TEAMCITY_VERSION = '1.0.0';
        // When
        const result = icon.success();
        // Then
        result.should.be.containEql('[v]');
    });

    it('Success icon on windows CI should be √', () => {
        // Given
        os.platform = () => 'windows';
        // When
        const result = icon.success();
        // Then
        result.should.be.containEql('√');
    });

    it('Success icon on linux CI should be ✓', () => {
        // Given
        os.platform = () => 'darwin';
        // When
        const result = icon.success();
        // Then
        result.should.be.containEql('✓');
    });

    it('Error icon on Teamcity CI should be [x]', () => {
        // Given
        process.env.TEAMCITY_VERSION = '1.0.0';
        // When
        const result = icon.error();
        // Then
        result.should.be.containEql('[x]');
    });

    it('Error icon on windows CI should be ×', () => {
        // Given
        os.platform = () => 'windows';
        // When
        const result = icon.error();
        // Then
        result.should.be.containEql('×');
    });

    it('Error icon on linux CI should be ✖', () => {
        // Given
        os.platform = () => 'darwin';
        // When
        const result = icon.error();
        // Then
        result.should.be.containEql('✖');
    });

    it("Should run when publish-please is started with command 'npm run publish-please --ci'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--ci"],"original":["run","publish-please","--ci"]}';

        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });

    it("Should run when publish-please is started with command 'npx publish-please --ci'", () => {
        // Given
        delete process.env['npm_config_argv'];

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
        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });

    it('Should report running task with success', () => {
        // Given
        const taskname = 'yo task';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(true);
        // Then
        const expected = `${
            os.platform().startsWith('win') ? '√' : '✓'
        } ${taskname}`;
        output.should.containEql(expected);
    });

    it.skip('Should report running task with success on Teamcity', () => {
        // Given
        os.platform = () => 'windows';
        process.env.TEAMCITY_VERSION = '1.0.0';
        const taskname = 'yo task';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(true);
        // Then
        const expected = `[v] ${taskname}`;
        output.should.containEql(expected);
    });

    it('Should report running task with failure', () => {
        // Given
        const taskname = 'yo task';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(false);
        // Then
        const expected = `${
            os.platform().startsWith('win') ? '×' : '✖'
        } ${taskname}`;
        output.should.containEql(expected);
    });

    it.skip('Should report running task with failure on Teamcity', () => {
        // Given
        os.platform = () => 'windows';
        process.env.TEAMCITY_VERSION = '1.0.0';
        const taskname = 'yo task';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(false);
        // Then
        const expected = `[x] ${taskname}`;
        output.should.containEql(expected);
    });

    it('Should report success', () => {
        // Given
        const message = 'yo message';

        // When
        reporter.reportSuccess(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report error', () => {
        // Given
        const message = 'yo error message';

        // When
        reporter.reportError(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report step', () => {
        // Given
        const message = 'yo step message';

        // When
        reporter.reportStep(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report as is', () => {
        // Given
        const message = 'yo line 1\nyo line 2\nyo line 3';

        // When
        reporter.reportAsIs(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report information', () => {
        // Given
        const message = 'yo information message';

        // When
        reporter.reportInformation(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report a running sequence', () => {
        // Given
        const message = 'running yo steps';

        // When
        reporter.reportRunningSequence(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report a succeeded sequence', () => {
        // Given
        const message = 'yo steps passed';

        // When
        reporter.reportSucceededSequence(message);
        // Then
        output.should.containEql(message);
    });

    it('Should report a succeeded process', () => {
        // Given
        const message = 'yo process passed';

        // When
        reporter.reportSucceededProcess(message);
        // Then
        output.should.containEql(message);
    });

    it('Should format as elegant path', () => {
        // Given
        const path = 'publish-please>ban-sensitive-files > ggit> lodash';
        const sep = '>';
        // When
        const result = reporter.formatAsElegantPath(path, sep);
        // Then
        result.should.containEql(
            'publish-please -> ban-sensitive-files -> ggit -> lodash'
        );
    });
});
