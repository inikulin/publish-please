'use strict';

const npxArgs = require('../lib/utils/get-npx-args');
/* eslint-disable no-unused-vars */
const should = require('should');
const pathJoin = require('path').join;

describe('npx args parser util', () => {
    before(() => {
        process.env['npm_config_argv'] = undefined;
    });
    it('Should parse even if process does not exist', () => {
        // Given
        const process = undefined;
        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse even if process.argv does not exist', () => {
        // Given
        const process = {};
        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse even if process.argv is not an array', () => {
        // Given
        const process = {};
        process.argv = {};
        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse even if process.argv is an empty array', () => {
        // Given
        const process = {};
        process.argv = [];
        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse even if the command is not an npx command', () => {
        // Given
        process.argv = ['/usr/local/bin/node', 'publish-please', '--dry-run'];
        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.false();
    });
    it('Should parse the command `npx publish-please --dry-run`', () => {
        // Given
        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--dry-run'
        // ]

        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            '--dry-run',
        ];

        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.true();
        args['config'].should.be.false();
    });

    it('Should parse the command `npx publish-please config`', () => {
        // Given
        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   'config'
        // ]

        process.argv = [
            pathJoin('usr', 'local', 'bin', 'node'),
            pathJoin(
                'Users',
                'xxx',
                '.npm',
                '_npx',
                '97852',
                'bin',
                'publish-please'
            ),
            'config',
        ];

        // When
        const args = npxArgs(process);
        // Then
        args['--dry-run'].should.be.false();
        args['config'].should.be.true();
    });
});
