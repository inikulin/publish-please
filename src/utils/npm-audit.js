'use strict';

const exec = require('cp-sugar').exec;
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;

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
        .then(() => responseFromAuditLogOrFromError(auditLogFilePath))
        .catch((err) => responseFromAuditLogOrFromError(auditLogFilePath, err))
        .then((response) => {
            if (
                response &&
                response.error &&
                response.error.code === 'EAUDITNOLOCK'
            ) {
                const createLockLogFilename = 'npm-audit-create-lock.log';
                const createLockFileCommand = `npm i --package-lock-only > ${createLockLogFilename}`;
                return exec(createLockFileCommand)
                    .then(() => exec(command))
                    .then(() =>
                        responseFromAuditLogOrFromError(auditLogFilePath)
                    )
                    .catch((err) =>
                        responseFromAuditLogOrFromError(auditLogFilePath, err)
                    );
            }
            return response;
        });
};

function responseFromAuditLogOrFromError(logFilePath, err) {
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
