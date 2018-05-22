'use strict';

const requires = require('../lib/utils/inquires');
/* eslint-disable no-unused-vars */
const should = require('should');
const stdinMock = require('mock-stdin');

/* eslint-disable max-nested-callbacks */
describe('Input with confirmation', () => {
    let stdin;
    before(() => {
        stdin = stdinMock.stdin();
    });
    after(() => {
        stdin.restore();
    });

    it('Should return the default value when pressing Enter on the Confirm Question and on the Input Question', () => {
        // Given
        const flow = {
            confirmQuestion: 'do your confirm this and that?',
            defaultAnswer: true,
            inputQuestion: 'what is the value?',
            defaultValue: 'the default value',
        };

        // When
        return (
            Promise.resolve()
                .then(() => {
                    simulateUserInput(['\r', '\r']);
                    return requires.inputWithConfirmation(
                        flow.confirmQuestion,
                        flow.defaultAnswer,
                        flow.inputQuestion,
                        flow.defaultValue
                    );
                })
                // Then
                .then((response) => {
                    return response.should.equal(flow.defaultValue);
                })
        );
    });

    it('Should return the default value when pressing Enter on the Confirm Question and on the Input Question - Even when the default answer for the Confirm Question is No', () => {
        // Given
        const flow = {
            confirmQuestion: 'do your confirm this and that?',
            defaultAnswer: false,
            inputQuestion: 'what is the value?',
            defaultValue: 'the default value',
        };

        // When
        return (
            Promise.resolve()
                .then(() => {
                    simulateUserInput(['\r', '\r']);
                    return requires.inputWithConfirmation(
                        flow.confirmQuestion,
                        flow.defaultAnswer,
                        flow.inputQuestion,
                        flow.defaultValue
                    );
                })
                // Then
                .then((response) => {
                    return response.should.equal(flow.defaultValue);
                })
        );
    });
});

describe('Input list of files', () => {
    let stdin;
    before(() => {
        stdin = stdinMock.stdin();
    });
    after(() => {
        stdin.restore();
    });

    it('Should return the default list when pressing Enter', () => {
        // Given
        const flow = {
            listQuestion:
                'List files you want to exclude (comma-separated, you can use glob patterns)',
            defaultList: ['lib/schema.rb', 'lib/*.keychain'],
        };

        // When
        return (
            Promise.resolve()
                .then(() => {
                    simulateUserInput(['\r']);
                    return requires.inputList(
                        flow.listQuestion,
                        flow.defaultList
                    );
                })
                // Then
                .then((response) => {
                    return response.should.equal(flow.defaultList);
                })
        );
    });

    it('Should return the custom list entered by the user', () => {
        // Given
        const flow = {
            listQuestion:
                'List files you want to exclude (comma-separated, you can use glob patterns)',
            defaultList: ['lib/schema.rb', 'lib/*.keychain'],
            listEnteredByUser: ['file1.dbx', 'dir/**/*.keychain'],
        };

        // When
        return (
            Promise.resolve()
                .then(() => {
                    simulateUserInput([
                        flow.listEnteredByUser.join(', ') + '\r',
                    ]);
                    return requires.inputList(
                        flow.listQuestion,
                        flow.defaultList
                    );
                })
                // Then
                .then((response) => {
                    return response.should.be.deepEqual(flow.listEnteredByUser);
                })
        );
    });
});

const simulateUserInput = (inputs) => {
    if (Array.isArray(inputs) && inputs.length === 0) {
        return;
    }
    const input = inputs.shift();
    setTimeout(() => {
        process.stdin.send(input);
        simulateUserInput(inputs);
    }, 1000);
};
