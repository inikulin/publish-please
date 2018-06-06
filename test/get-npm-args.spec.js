'use strict';

const npmArgs = require('../lib/utils/get-npm-args');
/* eslint-disable no-unused-vars */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');

describe('npm args parser util', () => {
    it('Should return an empty object when process.env does not exist', () => {
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
    it('Should parse the command `npm publish`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish"],"original":["publish"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.true();
        args.install.should.be.false();
        args['--with-publish-please'].should.be.false();
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
        args['--with-publish-please'].should.be.true();
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
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
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
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
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
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
        args['--with-publish-please'].should.be.false();
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
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
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
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
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
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
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
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
    });
});
