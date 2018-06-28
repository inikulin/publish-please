'use strict';
const exec = require('cp-sugar').exec;
const semver = require('semver');
const executionContext = require('./execution-context');

module.exports = {
    getCurrentNpmVersion,
    getCurrentNodeVersion,
    getCurrentNodeAndNpmVersions,
};

function getCurrentNpmVersion() {
    return exec('npm version --json').then((out) => JSON.parse(out).npm);
}

function getCurrentNodeVersion() {
    return Promise.resolve(process.version);
}

function getCurrentNodeAndNpmVersions() {
    return Promise.all([getCurrentNodeVersion(), getCurrentNpmVersion()]).then(
        (results) => {
            const versions = { node: results[0], npm: results[1] };

            const isNode6 = semver.gte(versions.node, '6.0.0');
            versions.isNode6 = isNode6;

            const isSafeNpmVersion = semver.satisfies(
                versions.npm,
                '>=2.15.8 <3.0.0 || >=3.10.1'
            );
            versions.isSafeNpmVersion = isSafeNpmVersion;

            const isPrePublishOnlyNpmVersion = semver.gte(
                versions.npm,
                '5.6.0'
            );
            versions.isPrePublishOnlyNpmVersion = isPrePublishOnlyNpmVersion;
            if (executionContext.isInTestMode()) {
                console.log('versions:');
                console.log(versions);
            }
            return Promise.resolve(versions);
        }
    );
}
