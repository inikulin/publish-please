'use strict';

const requires = require('../lib/utils/inquires');
/* eslint-disable no-unused-vars */
const should = require('should');
const stdin = require('mock-stdin').stdin();

/* eslint-disable max-nested-callbacks */
describe('Input with confirmation', () => {
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
