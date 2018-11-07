'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');
const reporter = require('../lib/reporters/elegant-status-reporter');
const rename = require('fs').renameSync;
const pathJoin = require('path').join;
const lineSeparator = '----------------------------------';

describe('Elegant status reporter', () => {
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;

    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
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
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Cannot run when chalk module is not found', () => {
        // Given

        // When
        const result = reporter.canRun();

        // Then
        result.should.be.false();
    });
});

describe('Elegant status reporter', () => {
    let nativeExit;
    let nativeConsoleLog;
    let exitCode;
    let output;

    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
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
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Can run when chalk module is found', () => {
        // Given

        // When
        const result = reporter.canRun();

        // Then
        result.should.be.true();
    });
});

describe('Elegant status reporter', () => {
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
    });
    afterEach(() => {
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Should run by default', () => {
        // Given

        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });
});
