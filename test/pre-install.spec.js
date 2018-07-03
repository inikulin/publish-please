'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
const copy = require('./utils/copy-file-sync');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;

describe('Pre-Install Execution', () => {
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

    it(`Should return an error message on 'npm install -g ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--global","${packageName}"],"original":["install","-g","${packageName}"]}`;

        // When
        requireUncached('../lib/pre-install');
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("publish-please can't be installed globally");
    });

    it(`Should not return an error message on 'npm install --save-dev ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--save-dev","${packageName}"],"original":["install","--save-dev","${packageName}"]}`;

        // When
        requireUncached('../lib/pre-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });
    it(`Should not return an error message on 'npm install' after a fresh git clone of ${packageName}'`, () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["install"],"original":["install"]}';
        mkdirp('test/tmp');
        copy('lib/pre-install.js', 'test/tmp/pre-install.js');

        // When
        requireUncached('./tmp/pre-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });

    it('Should not return an error message if npm args are not recognized', () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}],"cooked":["install","--global","${packageName}"],"original":["install","-g","${packageName}"]}`;

        // When
        requireUncached('../lib/pre-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });

    it(`Should not return an error message on 'npx ${packageName}'`, () => {
        // Given
        const npxPath = pathJoin('Users', 'HDO', '.npm', '_npx', '78031');
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","${packageName}","--global","--prefix","${npxPath}","--loglevel","error","--json"],"original":["install","${packageName}","--global","--prefix","${npxPath}","--loglevel","error","--json"]}`;

        // When
        requireUncached('../lib/pre-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });
});
