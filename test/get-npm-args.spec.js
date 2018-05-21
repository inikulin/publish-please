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
        args.should.be.empty;
    });
    it('Should return an empty object when the command is not an npm command', () => {
        // Given
        const processEnv = process.env;
        // When
        const args = npmArgs(processEnv);
        // Then
        args.should.be.empty;
    });
    it('Should parse the command `npm publish`', () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["publish"],"original":["publish"]}';
        // When
        const args = npmArgs(process.env);
        // Then
        args.publish.should.be.true;
    });
});
