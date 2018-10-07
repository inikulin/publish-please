const exec = require('cp-sugar').exec;
const readFile = require('fs').readFileSync;
const sep = require('path').sep;
const tempFolder = require('osenv').tmpdir();
const path = require('path');

/**
 * @inikulin: this module is developped with a TDD approach
 *            this means this code might look incomplete or even wrong
 * Audit the package that will be sent to the registry
 * @param {(string | undefined)} projectDir - project directory to be analyzed by npm-pack command
 * @returns {Object} returns an object with sensitive/non-essential files found in the package that will be sent to the registry
 */
module.exports = function auditPackage(projectDir) {
    try {
        const options = getDefaultOptionsFor(projectDir);
        process.chdir(options.directoryToPackage);
        const command = `npm pack --json > ${options.npmPackLogFilepath}`;
        return exec(command).then(() =>
            createResponseFromNpmPackLog(options.npmPackLogFilepath)
        );
    } catch (error) {
        return Promise.reject(error.message);
    }
};

function createResponseFromNpmPackLog(logFilePath) {
    try {
        const response = JSON.parse(readFile(logFilePath).toString());
        // prettier-ignore
        return Array.isArray(response)
            ? response[0]
            : response;
    } catch (err) {
        return {
            error: {
                summary: err.message,
            },
        };
    }
}

/**
 * @typedef DefaultOptions
 * @type {Object}
 * @property {string} directoryToPackage - Folder to package. Defaults to process.cwd()
 * @property {string} npmPackLogFilepath - Path of the file that will receive all output of the npm-pack command.
 */

/**
 * Get default options of this module
 * @param {string} projectDir - path to the directory that will be packaged by npm pack
 * @returns {DefaultOptions}
 */
function getDefaultOptionsFor(projectDir) {
    const directoryToPackage = projectDir || process.cwd();
    const projectName = directoryToPackage.split(sep).pop() || '';
    const packLogFilename = `npm-pack-${projectName.trim()}.log`;
    const npmPackLogFilepath = path.resolve(tempFolder, packLogFilename);

    return {
        directoryToPackage,
        npmPackLogFilepath,
    };
}
