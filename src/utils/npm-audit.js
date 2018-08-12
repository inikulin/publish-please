'use strict';

const exec = require('cp-sugar').exec;
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;
const unlink = require('fs').unlinkSync;
const sep = require('path').sep;
const tempFolder = require('osenv').tmpdir();
const path = require('path');
const EOL = require('os').EOL;

// npm audit error codes
/**
 * Missing package-lock.json
 */
const EAUDITNOLOCK = 'EAUDITNOLOCK';

/**
 * Audit the project in directory projectDir
 * @param {(string | undefined)} projectDir - project directory to be analyzed by npm audit
 */
module.exports = function audit(projectDir) {
    try {
        const options = getDefaultOptionsFor(projectDir);
        process.chdir(options.directoryToAudit);
        const command = `npm audit --json > ${options.auditLogFilepath}`;

        return exec(command)
            .then(() => createResponseFromAuditLog(options.auditLogFilepath))
            .catch((err) =>
                createResponseFromAuditLogOrFromError(
                    options.auditLogFilepath,
                    err
                )
            )
            .then((response) => {
                if (packageLockHasBeenFound(response)) {
                    return removeIgnoredVulnerabilities(response, options);
                }

                const createLockFileCommand = `npm i --package-lock-only > ${
                    options.createLockLogFilepath
                }`;

                return exec(createLockFileCommand)
                    .then(() => exec(command))
                    .then(() =>
                        createResponseFromAuditLog(options.auditLogFilepath)
                    )
                    .catch((err) =>
                        createResponseFromAuditLogOrFromError(
                            options.auditLogFilepath,
                            err
                        )
                    )
                    .then((result) =>
                        processResult(result).whenErrorIs(EAUDITNOLOCK)
                    )
                    .then((result) =>
                        removePackageLockFrom(options.directoryToAudit, result)
                    )
                    .then((result) =>
                        removeIgnoredVulnerabilities(result, options)
                    );
            });
    } catch (error) {
        return Promise.reject(error.message);
    }
};

function packageLockHasNotBeenFound(response) {
    return response && response.error && response.error.code === EAUDITNOLOCK;
}

function packageLockHasBeenFound(response) {
    return !packageLockHasNotBeenFound(response);
}

function createResponseFromAuditLog(logFilePath) {
    try {
        const response = JSON.parse(readFile(logFilePath).toString());
        return response;
    } catch (err) {
        return {
            error: {
                summary: err.message,
            },
        };
    }
}

function createResponseFromAuditLogOrFromError(logFilePath, err) {
    try {
        const response = JSON.parse(readFile(logFilePath).toString());
        return response;
    } catch (err2) {
        // prettier-ignore
        return {
            error: {
                summary: err && err.message
                    ? err.message
                    : err2.message,
            },
        };
    }
}

/**
 * Middleware that intercept any input error object.
 * This middleware may modify the inital error message
 * @param {Object} result -  result of the npm audit command
 */
function processResult(result) {
    return {
        whenErrorIs: (errorCode) => {
            if (
                errorCode === EAUDITNOLOCK &&
                packageLockHasNotBeenFound(result)
            ) {
                const summary = result.error.summary || '';
                result.error.summary = `package.json file is missing or is badly formatted. ${summary}`;
                return result;
            }
            return result;
        },
    };
}

/**
 * Middleware that removes the auto-generated package-lock.json
 * @param {string} projectDir - folder where the package-lock.json file has been generated
 * @param {*} response - result of the npm audit command (eventually modified by previous middlewares execution)
 * @returns input response if file removal is ok
 * In case of error it adds or updates into the input response object the property 'internalErrors'
 */
function removePackageLockFrom(projectDir, response) {
    try {
        const file = pathJoin(projectDir, 'package-lock.json');
        unlink(file);
        return response;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return response;
        }
        if (response) {
            response.internalErrors = response.internalErrors || [];
            response.internalErrors.push(error);
            return response;
        }
        return response;
    }
}

/**
 * exported for testing purposes
 */
module.exports.removePackageLockFrom = removePackageLockFrom;

/**
 * Remove, from npm audit command response, the vulnerabilities defined in .auditignore file
 * @param {*} response - result of the npm audit command (eventually modified by previous middlewares execution)
 * @param {DefaultOptions} options - options
 */
function removeIgnoredVulnerabilities(response, options) {
    try {
        const ignoredVulnerabilities = getIgnoredVulnerabilities(options);
        if (ignoredVulnerabilities && ignoredVulnerabilities.length === 0) {
            return response;
        }
        const filteredResponse = JSON.parse(JSON.stringify(response, null, 2));

        filteredResponse.actions = filteredResponse.actions
            .map((action) => {
                action.resolves = action.resolves.filter(
                    (resolve) =>
                        ignoredVulnerabilities.indexOf(`${resolve.id}`) < 0
                );
                return action;
            })
            .filter((action) => action.resolves.length > 0);

        ignoredVulnerabilities.forEach(
            (ignoredVulnerability) =>
                delete filteredResponse.advisories[ignoredVulnerability]
        );

        const vulnerabilitiesMetadata = {
            info: 0,
            low: 0,
            moderate: 0,
            high: 0,
            critical: 0,
        };

        const severities = {};
        const advisories = filteredResponse.advisories;
        for (const key in advisories) {
            if (advisories.hasOwnProperty(key)) {
                const advisory = advisories[key];
                severities[`${advisory.id}`] = advisory.severity;
            }
        }

        filteredResponse.actions.forEach((action) => {
            action.resolves.forEach((resolve) => {
                vulnerabilitiesMetadata[severities[`${resolve.id}`]] += 1;
            });
        });

        filteredResponse.metadata.vulnerabilities = vulnerabilitiesMetadata;

        return filteredResponse;
    } catch (error) {
        if (response) {
            response.internalErrors = response.internalErrors || [];
            response.internalErrors.push(error);
            return response;
        }
        return response;
    }
}

/**
 * exported for testing purposes
 */
module.exports.removeIgnoredVulnerabilities = removeIgnoredVulnerabilities;

/**
 * @typedef DefaultOptions
 * @type {Object}
 * @property {string} directoryToAudit - Folder to audit. Defaults to process.cwd()
 * @property {string} auditLogFilepath - Path of the file that will receive all output of the npm-audit command.
 * @property {string} createLockLogFilepath - Path of the file that will receive all output of the 'npm i --package-lock-only' command.
 */

/**
 * Get default options of this module
 * @param {string} projectDir - path to the directory that will be analyzed by npm audit
 * @returns {DefaultOptions}
 */
function getDefaultOptionsFor(projectDir) {
    const directoryToAudit = projectDir || process.cwd();
    const projectName = directoryToAudit.split(sep).pop() || '';
    const auditLogFilename = `npm-audit-${projectName.trim()}.log`;
    const auditLogFilepath = path.resolve(tempFolder, auditLogFilename);
    const createLockLogFilename = `npm-audit-${projectName.trim()}-create-lock.log`;
    const createLockLogFilepath = path.resolve(
        tempFolder,
        createLockLogFilename
    );

    return {
        directoryToAudit,
        auditLogFilepath,
        createLockLogFilepath,
    };
}

function getIgnoredVulnerabilities(options) {
    try {
        const auditIgnoreFile = pathJoin(
            options.directoryToAudit,
            '.auditignore'
        );
        const content = readFile(auditIgnoreFile).toString();
        return content
            .split(EOL)
            .filter((vulnerabilityUri) => vulnerabilityUri.includes('https://'))
            .map((vulnerabilityUri) => vulnerabilityUri.split('/').pop())
            .map((id) => id.replace('\n', ''))
            .map((id) => id.replace('\r', ''))
            .map((id) => id.trim());
    } catch (error) {
        return [];
    }
}
