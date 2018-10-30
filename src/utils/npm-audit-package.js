const exec = require('cp-sugar').exec;
const pathJoin = require('path').join;
const readFile = require('fs').readFileSync;
const sep = require('path').sep;
const tempFolder = require('osenv').tmpdir();
const path = require('path');
const globMatching = require('micromatch');
const unlink = require('fs').unlinkSync;

/**
 * Audit the package that will be sent to the registry
 * @param {(string | undefined)} projectDir - project directory to be analyzed by npm-pack command
 * @returns {Object} returns an object with sensitive/non-essential files found in the package that will be sent to the registry
 */
module.exports = function auditPackage(projectDir) {
    return (
        Promise.resolve()
            .then(() => getDefaultOptionsFor(projectDir))
            // prettier-ignore
            .then((options) => {
                process.chdir(options.directoryToPackage);
                const command = `npm pack --json > ${
                    options.npmPackLogFilepath
                }`;
                return exec(command)
                    .then(() =>
                        createResponseFromNpmPackLog(options.npmPackLogFilepath)
                    )
                    .then((response) => addSensitiveDataInfosIn(response))
                    .then((response) =>
                        updateSensitiveDataInfosOfIgnoredFilesIn(
                            response,
                            options
                        )
                    )
                    .then((response) =>
                        removePackageTarFileFrom(
                            options.directoryToPackage,
                            response
                        )
                    );
            })
    );
};

function createResponseFromNpmPackLog(logFilePath) {
    const content = readFile(logFilePath).toString();
    const extractedJson = extractJsonDataFrom(content);
    const response = JSON.parse(extractedJson);
    // prettier-ignore
    return Array.isArray(response)
        ? response[0]
        : response;
}

/**
 * Extract the Json data from input content.
 * The problem: the 'npm pack --json > output.log' command will run any 'prepublish' script
 * defined in the package.json file before executing the npm pack command itself.
 * In the context of publish-please, any already-installed publish-please package
 * has already a prepublish script:  "prepublish": "publish-please guard"
 * this will give the following output:
 *          > testing-repo@1.3.77 prepublish ...
 *          > publish-please guard
 *          [{real ouput of npm pack}]
 *
 * So the input content may be either a valid json file
 * or valid json data prefixed by the result of the prepublish script execution
 * @param {string} content
 */
function extractJsonDataFrom(content) {
    let firstValidIndex = 0;
    for (let index = 0; index <= content.length - 1; index++) {
        const char = content.charAt(index);
        if (char === '[' || char === '{') {
            firstValidIndex = index;
            break;
        }
    }
    return content.substr(firstValidIndex);
}

/**
 * exported for testing purposes
 */
module.exports.extractJsonDataFrom = extractJsonDataFrom;

/**
 * Add sensitive data infos for each file included in the package
 * @param {Object} response - result of the npm pack command (eventually modified by previous middlewares execution)
 * @returns {Object} returns a new response object that is a deep copy of input response
 *              with each file being tagged with a new boolean property 'isSensitiveData'.
 */
function addSensitiveDataInfosIn(response) {
    const allSensitiveDataPatterns = getDefaultSensitiveData();
    const augmentedResponse = JSON.parse(JSON.stringify(response, null, 2));
    const files = augmentedResponse.files || [];
    files.forEach((file) => {
        if (file && isSensitiveData(file.path, allSensitiveDataPatterns)) {
            file.isSensitiveData = true;
            return;
        }

        if (file) {
            file.isSensitiveData = false;
        }
    });
    return augmentedResponse;
}

/**
 * exported for testing purposes
 */
module.exports.addSensitiveDataInfosIn = addSensitiveDataInfosIn;

/**
 * Check if file in filepath is sensitive data
 * @param {string} filepath
 * @param {DefaultSensitiveData} allSensitiveDataPatterns
 * @returns {boolean}
 */
function isSensitiveData(filepath, allSensitiveDataPatterns) {
    if (
        filepath &&
        allSensitiveDataPatterns &&
        allSensitiveDataPatterns.ignoredData &&
        globMatching.any(filepath, allSensitiveDataPatterns.ignoredData, {
            matchBase: true,
            nocase: true,
        })
    ) {
        return false;
    }

    if (
        filepath &&
        allSensitiveDataPatterns &&
        allSensitiveDataPatterns.sensitiveData &&
        globMatching.any(filepath, allSensitiveDataPatterns.sensitiveData, {
            matchBase: true,
            nocase: true,
        })
    ) {
        return true;
    }
    return false;
}

/**
 * Update sensitive data infos for each ignored file included in the package
 * @param {Object} response - result of the npm pack command (eventually modified by previous middlewares execution)
 * @returns {Object} returns a new response object that is a deep copy of input response
 * with each ignored file being tagged with 'isSensitiveData=false'.
 */
function updateSensitiveDataInfosOfIgnoredFilesIn(response, options) {
    const ignoredData = getIgnoredSensitiveData(options);
    const updatedResponse = JSON.parse(JSON.stringify(response, null, 2));
    const files = updatedResponse.files || [];
    files.forEach((file) => {
        if (
            file &&
            file.isSensitiveData &&
            isIgnoredData(file.path, ignoredData)
        ) {
            file.isSensitiveData = false;
            return;
        }
    });
    return updatedResponse;
}

function isIgnoredData(filepath, ignoredData) {
    return (
        filepath &&
        globMatching.any(filepath, ignoredData, {
            matchBase: true,
            nocase: true,
        })
    );
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

/**
 * exported for testing purposes
 */
module.exports.getDefaultOptionsFor = getDefaultOptionsFor;

/**
 * @typedef DefaultSensitiveData
 * @type {Object}
 * @property {[string]} sensitiveData - all patterns that defines sensitive data
 * @property {[string]} ignoredData - all patterns that defines data that is not sensitive
 */

/**
 * get all sensitive data from the '.sensitivedata' file
 * @returns {DefaultSensitiveData}
 */
function getDefaultSensitiveData() {
    const sensitiveDataFile = pathJoin(__dirname, '..', '..', '.sensitivedata');
    const content = readFile(sensitiveDataFile).toString();
    const allPatterns = content
        .split(/\n|\r/)
        .map((line) => line.replace(/[\t]/g, ' '))
        .map((line) => line.trim())
        .filter((line) => line && line.length > 0)
        .filter((line) => !line.startsWith('#'));

    const sensitiveData = allPatterns.filter(
        (pattern) => !pattern.startsWith('!')
    );

    const ignoredData = allPatterns
        .filter((pattern) => pattern.startsWith('!'))
        .map((pattern) => pattern.replace('!', ''))
        .map((pattern) => pattern.trim());

    return {
        sensitiveData,
        ignoredData,
    };
}

/**
 * exported for testing purposes
 */
module.exports.getDefaultSensitiveData = getDefaultSensitiveData;

/**
 * Get files, in .publishrc configuration file, that should be ignored within the npm package
 * @param {DefaultOptions} options
 * @returns {[string]} returns the list of files that should be ignored
 */
function getIgnoredSensitiveData(options) {
    try {
        const sensitiveDataIgnoreFile = pathJoin(
            options.directoryToPackage,
            '.publishrc'
        );
        const publishPleaseConfiguration = JSON.parse(
            readFile(sensitiveDataIgnoreFile).toString()
        );
        const result =
            publishPleaseConfiguration &&
            publishPleaseConfiguration.validations &&
            publishPleaseConfiguration.validations.sensitiveData &&
            Array.isArray(
                publishPleaseConfiguration.validations.sensitiveData.ignore
            )
                ? publishPleaseConfiguration.validations.sensitiveData.ignore
                : [];
        return result;
    } catch (error) {
        return [];
    }
}

/**
 * exported for testing purposes
 */
module.exports.getIgnoredSensitiveData = getIgnoredSensitiveData;

/**
 * Middleware that removes the auto-generated package tar file
 * @param {string} projectDir - folder where the tar file has been generated
 * @param {*} response - result of the npm pack command (eventually modified by previous middlewares execution)
 * @returns input response if file removal is ok
 * In case of error it adds or updates into the input response object the property 'internalErrors'
 */
function removePackageTarFileFrom(projectDir, response) {
    try {
        const file = pathJoin(projectDir, response.filename);
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
module.exports.removePackageTarFileFrom = removePackageTarFileFrom;
