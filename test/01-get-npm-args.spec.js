'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const npmArgs = require('../lib/utils/get-npm-args');
const packageName = require('./utils/publish-please-version-under-test');
const pathJoin = require('path').join;
const lineSeparator = '----------------------------------';

describe('npm args parser util', () => {
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
    });
    afterEach(() => {
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Should return an empty object when process.env is undefined', () => {
        // Given
        const processEnv = undefined;
        // When
        const args = npmArgs(processEnv);
        // Then
        args.should.be.empty();
    });
    it('Should return an empty object when the command is not an npm command', () => {
        // Given
        process.env['npm_config_argv'] = undefined;
        const processEnv = process.env;
        // When
        const args = npmArgs(processEnv);
        // Then
        args.should.be.empty();
    });
    it('Should return an empty object when process.env["npm_config_argv"] does not exist', () => {
        // Given
        delete process.env['npm_config_argv'];
        // When
        const args = npmArgs(process.env);
        // Then
        args.should.be.empty();
    });
    it('Should return an empty object when process.env["npm_config_argv"] is a bad json', () => {
        // Given
        process.env['npm_config_argv'] = '<bad json>';
        const processEnv = process.env;
        // When
        const args = npmArgs(processEnv);
        // Then
        args.should.be.empty();
    });
    it('Should parse the command `npm publish`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish"],"original":["publish"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.true();
        args.install.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--with-publish-please'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse the command `npm publish --with-publish-please`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish","--with-publish-please"],"original":["publish","--with-publish-please"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.true();
        args.install.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--with-publish-please'].should.be.true();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse the command `npm run preinstall`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","preinstall"],"original":["run","preinstall"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.false();
        args.install.should.be.false();
        args.runScript.should.be.true();
        args.npx.should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse the command `npm install`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["install"],"original":["install"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.false();
        args.install.should.be.true();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse the command `npm i`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["i"],"original":["i"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.false();
        args.install.should.be.true();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it(`Should parse the command 'npm install --save-dev ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--save-dev","${packageName}"],"original":["install","--save-dev","${packageName}"]}`;
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it(`Should parse the command 'npm i -D ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["i","--save-dev","${packageName}"],"original":["i","-D","${packageName}"]}`;
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it(`Should parse the command 'npm install --global ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["install","--global","${packageName}"],"original":["install","-g","${packageName}"]}`;
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it(`Should parse the command 'npm i -g ${packageName}'`, () => {
        // Given
        process.env[
            'npm_config_argv'
        ] = `{"remain":["${packageName}"],"cooked":["i","--global","${packageName}"],"original":["i","-g","${packageName}"]}`;
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.false();
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it("Should parse the command 'npm run publish-please --dry-run'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run"],"original":["run","publish-please","--dry-run"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.false();
        args.publish.should.be.false();
        args.runScript.should.be.true();
        args.npx.should.be.false();
        args['--global'].should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.true();
        args['--ci'].should.be.false();
        args['config'].should.be.false();
    });
    it("Should parse the command 'npm run publish-please --ci'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--ci"],"original":["run","publish-please","--ci"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.false();
        args.publish.should.be.false();
        args.runScript.should.be.true();
        args.npx.should.be.false();
        args['--global'].should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.false();
        args['--ci'].should.be.true();
        args['config'].should.be.false();
    });
    it("Should parse the command 'npm run publish-please --dry-run --ci'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--dry-run", "--ci"],"original":["run","publish-please","--dry-run", "--ci"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.false();
        args.publish.should.be.false();
        args.runScript.should.be.true();
        args.npx.should.be.false();
        args['--global'].should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.true();
        args['--ci'].should.be.true();
        args['config'].should.be.false();
    });
    it("Should parse the command 'npm run publish-please config'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["config"],"cooked":["run","publish-please","config"],"original":["run","publish-please","config"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.false();
        args.publish.should.be.false();
        args.runScript.should.be.true();
        args.npx.should.be.false();
        args['--global'].should.be.false();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.false();
        args['config'].should.be.true();
    });

    it("Should parse the command 'npx publish-please'", () => {
        // Given
        const npxPath = JSON.stringify(
            pathJoin('Users', 'HDO', '.npm', '_npx', '78031')
        );
        process.env[
            'npm_config_argv'
        ] = `{"remain":["publish-please"],"cooked":["install","publish-please","--global","--prefix",${npxPath},"--loglevel","error","--json"],"original":["install","publish-please","--global","--prefix",${npxPath},"--loglevel","error","--json"]}`;
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args.runScript.should.be.false();
        args.npx.should.be.true();
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
});
