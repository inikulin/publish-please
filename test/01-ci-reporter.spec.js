'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const packageName = require('./utils/publish-please-version-under-test');
const reporter = require('../lib/reporters/ci-reporter');
const rename = require('fs').renameSync;
const pathJoin = require('path').join;
const lineSeparator = '----------------------------------';

describe('CI reporter', () => {
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
    });
    afterEach(() => {
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Should not run by default', () => {
        // Given

        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.false();
    });

    it("Should run when publish-please is started with command 'npm run publish-please --ci'", () => {
        // Given
        process.env['npm_config_argv'] =
            '{"remain":[],"cooked":["run","publish-please","--ci"],"original":["run","publish-please","--ci"]}';

        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });

    it("Should run when publish-please is started with command 'npx publish-please --ci'", () => {
        // Given
        delete process.env['npm_config_argv'];

        // [ '/usr/local/bin/node',
        //   '/Users/HDO/.npm/_npx/97852/bin/publish-please',
        //   '--ci'
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
            '--ci',
        ];
        // When
        const result = reporter.shouldRun();
        // Then
        result.should.be.true();
    });
});
