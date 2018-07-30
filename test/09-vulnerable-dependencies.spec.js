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
});
