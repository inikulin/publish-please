'use strict';
const pathJoin = require('path').join;

module.exports = function getProjectDir() {
    // NOTE:
    // Given I am in <projectDir>
    // When  I run the command 'npm install --save-dev publish-please'
    // Then  __dirname = <projectDir>/node_modules/publish-please/lib/utils
    //
    // Given I cloned the publish-please repo in <projectDir>
    // When  I run the command 'npm install' just after cloning
    // Then  __dirname =  <projectDir>/lib/utils

    const nodeModulesPath = pathJoin('node_modules', 'publish-please', 'lib');
    if (__dirname.includes(nodeModulesPath)) {
        return pathJoin(__dirname, '../../../../');
    }
    return pathJoin(__dirname, '../../');
};
