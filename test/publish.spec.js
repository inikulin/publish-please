'use strict';

/* eslint-disable no-unused-vars */
const pathJoin = require('path').join;
const should = require('should');
const stdinMock = require('mock-stdin');
const simulateUserInput = require('./utils/simulate-user-input');
const writeFile = require('fs').writeFileSync;
const publish = require('../lib/publish');

/* eslint-disable max-nested-callbacks */
describe('Publish execution', () => {
    it('Should throw an error if .publishrc is a bad json', () => {
        // Given .publishrc is a bad formatted json file
        const opts = '<bad json>';
        const rcFile = pathJoin(process.cwd(), '.publishrc');
        writeFile(rcFile, opts);

        // When I run the 'npm run publish-please' command
        return Promise.resolve()
            .then(() => publish.getOptions())
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
