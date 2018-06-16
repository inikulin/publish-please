'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const cli = require('../lib');

describe('Publish-please CLI Options', () => {
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;

    beforeEach(() => {
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
});
