'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const stdinMock = require('mock-stdin');
const simulateUserInput = require('./utils/simulate-user-input');
const pathJoin = require('path').join;
const mkdirp = require('mkdirp');
const config = require('../lib/config');

/* eslint-disable max-nested-callbacks */
describe('Config execution', () => {
    let stdin;
    before(() => {
        return Promise.resolve().then(() => (stdin = stdinMock.stdin()));
    });
    beforeEach(() => {
        return Promise.resolve().then(() => stdin.reset());
    });
    after(() => {
        return Promise.resolve().then(() => stdin.restore());
    });

    it('Should create a .publishrc file with specified values', () => {
        // Given
        const userInputs = [
            'y\r', // Do you want to run any scripts before publishing (e.g. build steps, tests)?
            'npm test\r', // Input pre-publish script npm test
            'n\r', // Do you want to run any scripts after succesful publishing (e.g. release announcements, binary uploading)?
            'npm publish\r', // Specify publishing command which will be used to publish your package
            'latest\r', // Specify release tag with which you package will be published latest
            'y\r', // Do you want manually confirm publishing?
            'y\r', // Would you like to verify that your package doesn't have vulnerable dependencies before publishing?
            'y\r', // Would you like to verify that there are no uncommitted changes in your working tree before publishing?
            'y\r', // Would you like to verify that there are no files that are not tracked by git in your working tree before publishing?
            'y\r', // Would you like to verify that there is no sensitive data in your working tree?
            'n\r', // Is there any files that you want to exclude from check?
            'y\r', // Would you like to verify that you are publishing from the correct git branch?
            'master\r', // Which branch should it be?
            'y\r', // Would you like to verify that published commit has git tag that is equal to the version specified in package.json?
            'y\r', // Is this OK?
        ];
        const projectDir = pathJoin(__dirname, 'tmp');
        mkdirp.sync(projectDir);
        const opts = config.getCurrentOpts(projectDir);

        // When
        return (
            Promise.resolve()
                .then(() => {
                    simulateUserInput(userInputs);
                    return config.configurePublishPlease
                        .with(opts)
                        .inProject(projectDir);
                })
                // Then
                .then(() => {
                    const expectedOptions = {
                        validations: {
                            vulnerableDependencies: true,
                            uncommittedChanges: true,
                            untrackedFiles: true,
                            sensitiveData: true,
                            branch: 'master',
                            gitTag: true,
                        },
                        confirm: true,
                        publishCommand: 'npm publish',
                        publishTag: 'latest',
                        prePublishScript: 'npm test',
                        postPublishScript: false,
                    };
                    const generatedOptions = config.getCurrentOpts(projectDir);
                    return generatedOptions.should.deepEqual(expectedOptions);
                })
        );
    });
});
