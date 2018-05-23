'use strict';

const npmArgs = require('../lib/utils/get-npm-args');
/* eslint-disable no-unused-vars */
const should = require('should');

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
    it('Should parse the command `npm install --save-dev publish-please@2.5.0`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["publish-please@2.5.0"],"cooked":["install","--save-dev","publish-please@2.5.0"],"original":["install","--save-dev","publish-please@2.5.0"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
    });
    it('Should parse the command `npm i -D publish-please@2.5.0`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["publish-please@2.5.0"],"cooked":["i","--save-dev","publish-please@2.5.0"],"original":["i","-D","publish-please@2.5.0"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args['--save-dev'].should.be.true();
        args['--save'].should.be.false();
        args['--global'].should.be.false();
    });
    it('Should parse the command `npm install --global publish-please@2.5.0`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["publish-please@2.5.0"],"cooked":["install","--global","publish-please@2.5.0"],"original":["install","-g","publish-please@2.5.0"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.install.should.be.true();
        args.publish.should.be.false();
        args['--global'].should.be.true();
        args['--save-dev'].should.be.false();
        args['--save'].should.be.false();
    });
    it('Should parse the command `npm i -g publish-please@2.5.0`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":["publish-please@2.5.0"],"cooked":["i","--global","publish-please@2.5.0"],"original":["i","-g","publish-please@2.5.0"]}';
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
