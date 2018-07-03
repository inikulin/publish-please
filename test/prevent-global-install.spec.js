'use strict';

/* eslint-disable no-unused-vars */
/* eslint-disable no-global-assign */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');
const preventGlobalInstall = require('../lib/prevent-global-install');
const rename = require('fs').renameSync;
const pathJoin = require('path').join;

describe('Prevent Global Install', () => {
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
        delete require.cache[require.resolve('chalk')];
        rename('./node_modules/chalk', './node_modules/chalk0');
    });
    afterEach(() => {
        process.exit = nativeExit;
        console.log = nativeConsoleLog;
        rename('./node_modules/chalk0', './node_modules/chalk');
    });
    it(`Should not throw an error when chalk module is not found on 'npm install -g ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--global","${packageName}"],"original":["install","-g","${packageName}"]}`;

        // When
        preventGlobalInstall();
        // Then
        exitCode.should.be.equal(1);
        output.should.containEql("publish-please can't be installed globally");
    });

    it(`Should not throw an error when chalk module is not found on 'npm install --save-dev ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--save-dev","${packageName}"],"original":["install","--save-dev","${packageName}"]}`;

        // When
        preventGlobalInstall();
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });

    it(`Should not throw an error when chalk module is not found on 'npx ${packageName}'`, () => {
        // Given
        const npxPath = pathJoin('Users', 'HDO', '.npm', '_npx', '78031');
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","${packageName}","--global","--prefix","${npxPath}","--loglevel","error","--json"],"original":["install","${packageName}","--global","--prefix","${npxPath}","--loglevel","error","--json"]}`;

        // When
        preventGlobalInstall();
        // Then
        (exitCode || 0).should.be.equal(0);
        output.should.be.equal('');
    });
});
