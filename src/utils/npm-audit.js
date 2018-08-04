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
    console.log(`auditing project in ${process.cwd()}`);
    const command = `npm audit --json > ${auditLogFilename}`;
    return exec(command)
        .then(() => {
            return responseFromAuditLogOrFromError(auditLogFilePath);
        })
        .catch((err) => {
            return responseFromAuditLogOrFromError(auditLogFilePath, err);
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
