'use strict';
const exec = require('cp-sugar').exec;
const execSync = require('./exec-sync');
const semver = require('semver');

module.exports = {
    getCurrentNodeAndNpmVersions,
    getCurrentNodeAndNpmVersionsSync,
};

function getCurrentNodeAndNpmVersionsSync() {
    const npm = getCurrentNpmVersionSync();
    const node = getCurrentNodeVersionSync();
    const isNode6 = isVersion6(node);
    const isSafeNpm = isSafeNpmVersion(npm);
    const shouldUsePrePublishOnlyScript = shouldUsePrePublishOnlyScriptInThis(
        npm
    );
    return {
        node,
        npm,
        isNode6,
        isSafeNpm,
        shouldUsePrePublishOnlyScript,
    };
}

function getCurrentNodeAndNpmVersions() {
    return Promise.all([getCurrentNodeVersion(), getCurrentNpmVersion()]).then(
        (results) => {
            const node = results[0];
            const npm = results[1];
            const isNode6 = isVersion6(node);
            const isSafeNpm = isSafeNpmVersion(npm);
            const shouldUsePrePublishOnlyScript = shouldUsePrePublishOnlyScriptInThis(
                npm
            );

            return Promise.resolve({
                node,
                npm,
                isNode6,
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

function isVersion6(version) {
    return semver.gte(version, '6.0.0');
}

function isSafeNpmVersion(version) {
    return semver.satisfies(version, '>=2.15.8 <3.0.0 || >=3.10.1');
}

function shouldUsePrePublishOnlyScriptInThis(version) {
    return semver.gte(version, '5.6.0');
}
