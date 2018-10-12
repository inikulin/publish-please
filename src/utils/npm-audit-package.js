const exec = require('cp-sugar').exec;
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;
const sep = require('path').sep;
const tempFolder = require('osenv').tmpdir();
const path = require('path');
const globMatching = require('micromatch');

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
 * Add sensitive data infos for each file included in the package
 * @param {*} response - result of the npm pack command (eventually modified by previous middlewares execution)
 * @returns {*} returns a new response object that is a deep copy of input response
 *              with each file being tagged with a new boolean property 'isSensitiveData'.
 */
function addSensitiveDataInfosIn(response) {
    try {
        const sensitiveData = getDefaultSensitiveData();
        const augmentedResponse = JSON.parse(JSON.stringify(response, null, 2));
        const files = augmentedResponse.files || [];
        files.forEach((file) => {
            if (
                file &&
                file.path &&
                globMatching.any(file.path, sensitiveData)
            ) {
                file.isSensitiveData = true;
                return;
            }

            if (file) {
                file.isSensitiveData = false;
            }
        });
        return augmentedResponse;
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
module.exports.addSensitiveDataInfosIn = addSensitiveDataInfosIn;

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

function getDefaultSensitiveData() {
    try {
        const sensitiveDataFile = pathJoin(
            __dirname,
            '..',
            '..',
            '.sensitive-data'
        );
        const content = readFile(sensitiveDataFile).toString();
        return content
            .split(/\n|\r/)
            .map((line) => line.replace(/[\t]/g, ' '))
            .map((line) => line.trim())
            .filter((line) => line && line.length > 0)
            .filter((line) => !line.startsWith('#'));
    } catch (error) {
        return [];
    }
}

/**
 * exported for testing purposes
 */
module.exports.getDefaultSensitiveData = getDefaultSensitiveData;
