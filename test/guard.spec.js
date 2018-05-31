'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');

describe('Guard Execution', () => {
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;

    beforeEach(() => {
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
    });

    it('Should return an error message on `npm publish`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish"],"original":["publish"]}';
        // When
        requireUncached('../lib/guard');
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("'npm publish' is forbidden for this package");
    });

    it('Should not return an error message on `npm publish --with-publish-please`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish","--with-publish-please"],"original":["publish","--with-publish-please"]}';
        // When
        requireUncached('../lib/guard');
        // Then
        exitCode.should.be.equal(0);
        output.should.not.containEql(
            "'npm publish' is forbidden for this package"
        );
    });
});
