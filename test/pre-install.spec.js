'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
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
        // NOTE: following hack enables to execute this test
        //          with vscode debug an under normal npm test
        const projectDir = process.cwd().includes('testing-repo')
            ? pathJoin(process.cwd(), '..')
            : process.cwd();

        process.chdir(projectDir);

        // When
        requireUncached('../lib/pre-install');
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("publish-please can't be installed globally");
    });
});
