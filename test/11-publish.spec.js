'use strict';

/* eslint-disable no-unused-vars */
const pathJoin = require('path').join;
const should = require('should');
const writeFile = require('fs').writeFileSync;
const getOptions = require('../lib/publish-options').getOptions;
const lineSeparator = '----------------------------------';

/* eslint-disable max-nested-callbacks */
describe('Publish execution', () => {
    let originalWorkingDirectory;
    before(() => {
        originalWorkingDirectory = process.cwd();
    });
    beforeEach(() =>
        console.log(`${lineSeparator} begin test ${lineSeparator}`));
    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });

    it('Should throw an error if .publishrc is a bad json', () => {
        // Given .publishrc is a bad formatted json file
        const opts = '<bad json>';
        const projectDir = pathJoin(__dirname, 'tmp');
        const rcFile = pathJoin(projectDir, '.publishrc');
        writeFile(rcFile, opts);

        // When I run the 'npm run publish-please' command
        return Promise.resolve()
            .then(() => getOptions({}, projectDir))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch((err) => {
                // Then I should receive an error message
                return err.message.should.containEql(
                    '.publishrc is not a valid JSON file'
                );
            });
    });
});
