'use strict';
const exec = require('cp-sugar').exec;
const execSync = require('./exec-sync');
const semver = require('semver');

module.exports = {
    getNodeInfos,
    getNodeInfosSync,
};

function getNodeInfosSync() {
    const npmVersion = getCurrentNpmVersionSync();
    const nodeVersion = getCurrentNodeVersionSync();
    const isAtLeastNode6 = isAtLeastVersion6(nodeVersion);
    const isSafeNpm = isSafeNpmVersion(npmVersion);
    const shouldUsePrePublishOnlyScript = shouldUsePrePublishOnlyScriptInThis(
        npmVersion
    );
    return {
        nodeVersion,
        npmVersion,
        isAtLeastNode6,
        isSafeNpm,
        shouldUsePrePublishOnlyScript,
    };
}

function getNodeInfos() {
    return Promise.all([getCurrentNodeVersion(), getCurrentNpmVersion()]).then(
        (results) => {
            const nodeVersion = results[0];
            const npmVersion = results[1];
            const isAtLeastNode6 = isAtLeastVersion6(nodeVersion);
            const isSafeNpm = isSafeNpmVersion(npmVersion);
            const shouldUsePrePublishOnlyScript = shouldUsePrePublishOnlyScriptInThis(
                npmVersion
            );

            return Promise.resolve({
                nodeVersion,
                npmVersion,
                isAtLeastNode6,
                isSafeNpm,
                shouldUsePrePublishOnlyScript,
            });
        }
    );
}

function getCurrentNpmVersion() {
    return exec('npm version --json').then((out) => JSON.parse(out).npm);
}

function getCurrentNpmVersionSync() {
    const result = execSync('npm version --json');
    return JSON.parse(result).npm;
}

function getCurrentNodeVersion() {
    return Promise.resolve(process.version);
}

function getCurrentNodeVersionSync() {
    return process.version;
}

function isAtLeastVersion6(version) {
    return semver.gte(version, '6.0.0');
}

function isSafeNpmVersion(version) {
    return semver.satisfies(version, '>=2.15.8 <3.0.0 || >=3.10.1');
}

function shouldUsePrePublishOnlyScriptInThis(version) {
    return semver.gte(version, '5.6.0');
}
