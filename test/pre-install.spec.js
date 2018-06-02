'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
const copy = require('fs').copyFileSync;
const mkdirp = require('mkdirp');

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
        output.should.containEql('');
    });
    it(`Should not return an error message on 'npm install' after a fresh git clone of ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--save-dev","${packageName}"],"original":["install","--save-dev","${packageName}"]}`;
        mkdirp('test/tmp');
        copy('lib/pre-install.js', 'test/tmp/pre-install.js');

        // When
        requireUncached('./tmp/pre-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.containEql('');
    });
});
