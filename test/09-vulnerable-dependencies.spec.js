'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const validation = require('../lib/validations/vulnerable-dependencies');

describe('Vulnerability validation', () => {
    it('Should default to false when npm version is < 6, to true otherwise', () => {
        // Given the current node version

        // When
        const defaultParam = validation.defaultParam;

        // Then
        nodeInfos.isAtLeastNpm6
            ? defaultParam.should.be.true()
            : defaultParam.should.be.false();
    });
    it('Should show a skipped message when npm version is < 6', () => {
        // Given the current node version

        // When
        const statusText = validation.statusText;

        // Then
        /* prettier-ignore */
        nodeInfos.isAtLeastNpm6
            ? statusText.should.containEql('Checking for the vulnerable dependencies')
            : statusText.should.containEql('Skipped vulnerable dependencies');
    });
    it('Should not run when npm version is < 6', () => {
        // Given the current node version

        // When
        const canRun = validation.canRun();

        // Then
        /* prettier-ignore */
        nodeInfos.isAtLeastNpm6
            ? canRun.should.be.true()
            : canRun.should.be.false();
    });
});
