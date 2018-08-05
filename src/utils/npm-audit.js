'use strict';

const exec = require('cp-sugar').exec;
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;
const unlink = require('fs').unlinkSync;

// npm audit error codes
const EAUDITNOLOCK = 'EAUDITNOLOCK';

/**
 * @inikulin - this code is generated using a TDD approach. It might look incomplete or wrong because of this
 * @param {(string | undefined)} projectDir - project directory to be analyzed by npm audit
 */
module.exports = function audit(projectDir) {
    const directoryToAudit = projectDir || process.cwd();
    const auditLogFilename = 'npm-audit.log';
    const auditLogFilePath = pathJoin(directoryToAudit, auditLogFilename);

    process.chdir(directoryToAudit);
    const command = `npm audit --json > ${auditLogFilename}`;
    return exec(command)
        .then(() => createResponseFromAuditLog(auditLogFilePath))
        .catch((err) =>
            createResponseFromAuditLogOrFromError(auditLogFilePath, err)
        )
        .then((response) => {
            if (
                response &&
                response.error &&
                response.error.code === EAUDITNOLOCK
            ) {
                const createLockLogFilename = 'npm-audit-create-lock.log';
                const createLockFileCommand = `npm i --package-lock-only > ${createLockLogFilename}`;
                return exec(createLockFileCommand)
                    .then(() => exec(command))
                    .then(() => createResponseFromAuditLog(auditLogFilePath))
                    .catch((err) =>
                        createResponseFromAuditLogOrFromError(
                            auditLogFilePath,
                            err
                        )
                    )
                    .then((result) =>
                        processResult(result).whenErrorIs(EAUDITNOLOCK)
                    )
                    .then((result) =>
                        removePackageLockFrom(projectDir, result)
                    );
            }
            return response;
        });
};

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

function processResult(result) {
    return {
        whenErrorIs: (errorCode) => {
            if (
                errorCode === EAUDITNOLOCK &&
                result &&
                result.error &&
                result.error.code === errorCode
            ) {
                const summary = result.error.summary || '';
                result.error.summary = `package.json file is missing or is badly formatted. ${summary}`;
                return result;
            }
            return result;
        },
    };
}

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
            response.internalErrors.push(error.message);
            return response;
        }
    }
}
