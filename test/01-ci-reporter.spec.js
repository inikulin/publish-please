'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');
const reporter = require('../lib/reporters/ci-reporter');
const rename = require('fs').renameSync;
const pathJoin = require('path').join;
const platform = require('os').platform();
const envType = require('../lib/reporters/env-type');
const lineSeparator = '----------------------------------';

describe('CI reporter', () => {
    let nativeExit;
    let nativeConsoleLog;
    let nativeIsCI;
    let exitCode;
    let output;

    beforeEach(() => {
        console.log(
            `${lineSeparator} begin test - platform: ${platform} ${lineSeparator}`
        );
        exitCode = undefined;
        output = '';
        nativeExit = process.exit;
        nativeConsoleLog = console.log;
        nativeIsCI = envType.isCI;
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
        const taskname = 'yo yask';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(true);
        // Then
        const expected = `${
            platform.startsWith('win') ? '√' : '✓'
        } ${taskname}`;
        output.should.containEql(expected);
    });

    it('Should report running task with failure', () => {
        // Given
        const taskname = 'yo yask';
        const done = reporter.reportRunningTask(taskname);

        // When
        const result = done(false);
        // Then
        const expected = `${
            platform.startsWith('win') ? '×' : '✖'
        } ${taskname}`;
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
