'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
const copy = require('./utils/copy-file-sync');
const mkdirp = require('mkdirp');
const init = require('../lib/init');
const pathJoin = require('path').join;

describe('Post-Install Execution', () => {
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

    it(`Should return a warning message on 'npm install' after a fresh git clone of ${packageName}'`, () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["install"],"original":["install"]}';

        // When
        requireUncached('../lib/post-install');
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.containEql('post-install hooks are ignored in dev mode');
    });
    it(`Should return an error message when the package.json file is missing on 'npm install --save-dev ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--save-dev","${packageName}"],"original":["install","--save-dev","${packageName}"]}`;
        mkdirp('test/tmp');
        const projectDir = pathJoin(__dirname, 'tmp');

        // When
        init(projectDir);
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("project's package.json either missing");
    });
});
