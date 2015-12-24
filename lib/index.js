'use strict';

const exec            = require('child_process').exec;
const spawn           = require('cross-spawn-async');
const readFile        = require('fs').readFileSync;
const elegantSpinner  = require('elegant-spinner');
const logUpdate       = require('log-update');
const inquirer        = require('inquirer');
const chalk           = require('chalk');
const defaults        = require('defaults');
const PluginError     = require('gulp-util').PluginError;
const OS              = require('os-family');
const noop            = require('noop-fn');
const isSensitiveData = require('ban-sensitive-files');
const globby          = require('globby');
const emoji           = require('node-emoji').emoji;
const promisifyEvent  = require('promisify-event');

function createSpinner (text) {
    if (module.exports.testMode)
        return noop;

    const frame     = elegantSpinner();
    const animation = setInterval(() => logUpdate(chalk.yellow(frame()) + ' ' + text), 50);

    animation.unref();

    return ok => {
        const status = ok ?
                       chalk.green(OS.win ? '√' : '✓') :
                       chalk.red(OS.win ? '×' : '✖');

        clearInterval(animation);
        logUpdate(status + ' ' + text);
        console.log();
    };
}

function throwError (msg) {
    throw new PluginError('publish-please', msg);
}

function confirmPublish () {
    return new Promise(resolve => {
        const question = {
            type:    'confirm',
            name:    'publish',
            message: 'Are you sure you want to publish this version to npm?',
            default: false
        };

        inquirer.prompt(question, answer => resolve(answer.publish));
    });
}

function cmd (command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout) => {
            if (err)
                reject(err);
            else
                resolve(stdout.trim());
        });
    });
}

function run (command) {
    const args = command.split(/\s/);

    command = args.shift();

    const stdio = module.exports.testMode ? 'ignore' : 'inherit';
    const proc  = spawn(command, args, { stdio: stdio });

    const error = promisifyEvent(proc, 'error')
        .catch(err => throwError('Command `' + command + '` thrown error: \n' + err.message));

    const completion = promisifyEvent(proc, 'exit')
        .then(code => {
            code = Array.isArray(code) ? code[0] : code;

            if (code !== 0)
                throwError('Command `' + command + '` exited with code ' + code + '.');

            return code;
        });

    return Promise.race([completion, error]);
}

function validateGitTag (pkgVersion) {
    const stopSpinner = createSpinner('Validating git tag');

    return cmd('git describe --exact-match --tags HEAD')
        .catch(() => {
            stopSpinner(false);
            throw "Latest commit doesn't have git tag.";
        })
        .then(tag => {
            if (tag !== pkgVersion && tag !== 'v' + pkgVersion) {
                stopSpinner(false);
                throw 'Expected git tag to be `' + pkgVersion + '` or ' +
                      '`v' + pkgVersion + '`, but it was `' + tag + '`.';
            }

            stopSpinner(true);
        });
}

function validateBranch (expected) {
    const stopSpinner = createSpinner('Validating branch');

    return cmd("git branch | sed -n '/\\* /s///p'")
        .then(branch => {
            if (branch !== expected) {
                stopSpinner(false);
                throw 'Expected branch to be `' + expected + '`, but it was `' + branch + '`.';
            }

            stopSpinner(true);
        });
}

function checkForUncommittedChanges () {
    const stopSpinner = createSpinner('Checking for the uncommitted changes');

    // NOTE: see http://stackoverflow.com/questions/2657935/checking-for-a-dirty-index-or-untracked-files-with-git
    return cmd('git status --porcelain')
        .then(result => {
            if (/^([ADRM]| [ADRM])/m.test(result)) {
                stopSpinner(false);
                throw 'There are uncommitted changes in the working tree.';
            }

            stopSpinner(true);
        });
}

function checkForUntrackedFiles () {
    const stopSpinner = createSpinner('Checking for the untracked files');

    // NOTE: see http://stackoverflow.com/questions/2657935/checking-for-a-dirty-index-or-untracked-files-with-git
    return cmd('git status --porcelain')
        .then(result => {
            if (/^\?\?/m.test(result)) {
                stopSpinner(false);
                throw 'There are untracked files in the working tree.';
            }

            stopSpinner(true);
        });
}

function sensitiveDataAudit () {
    const stopSpinner = createSpinner('Performing sensitive data audit');

    return globby(['**/*'])
        .then(paths => {
            let errs     = [];
            const addErr = errs.push.bind(errs);

            paths
                .filter(path => !/^node_modules\//.test(path))
                .forEach(path => isSensitiveData(path, addErr));

            if (errs.length) {
                stopSpinner(false);

                errs = errs.map(err => {
                    return err
                        .split(/\n/)
                        .map(line => '    ' + line)
                        .join('\n');
                });

                throw 'Sensitive data found in the working tree:\n' + errs.join('\n');
            }

            stopSpinner(true);
        });
}

function printReleaseInfo (pkgVersion, tag) {
    let commitInfo = null;

    return cmd('git log -1 --oneline')
        .then(info => {
            commitInfo = info;

            return cmd('npm whoami --silent');
        })
        .catch(() => chalk.red('<not logged in>'))
        .then(publisher => {
            console.log(chalk.yellow('Release info'));
            console.log(chalk.yellow('------------'));
            console.log('  ' + chalk.magenta('Version:       ') + pkgVersion);
            console.log('  ' + chalk.magenta('Latest commit: ') + commitInfo);
            console.log('  ' + chalk.magenta('Publish tag:   ') + tag);
            console.log('  ' + chalk.magenta('Publisher:     ') + publisher);
            console.log();
        });
}

function readPkgVersion () {
    let version = null;

    try {
        version = JSON.parse(readFile('package.json').toString()).version;
    }
    catch (err) {
        throwError("Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
    }

    if (!version)
        throwError('Version is not specified in package.json.');

    return version;
}

function getValidations (opts, pkgVersion) {
    const validations = [];

    if (opts.validateBranch)
        validations.push(() => validateBranch(opts.validateBranch));

    if (opts.validateGitTag)
        validations.push(() => validateGitTag(pkgVersion));

    if (opts.checkUncommitted)
        validations.push(checkForUncommittedChanges);

    if (opts.checkUntracked)
        validations.push(checkForUntrackedFiles);

    if (opts.sensitiveDataAudit)
        validations.push(sensitiveDataAudit);

    return validations;
}

function runValidations (opts, pkgVersion) {
    const errs        = [];
    const addError    = errs.push.bind(errs);
    const validations = getValidations(opts, pkgVersion);

    if (!validations.length)
        return Promise.resolve();

    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running validations'));
        console.log(chalk.yellow('-------------------'));
        console.log();
    }

    return validations
        .reduce((validationPromise, validation) => validationPromise.then(validation).catch(addError), Promise.resolve())
        .then(() => {
            if (errs.length) {
                const msg = errs.map(err => '  * ' + err).join('\n');

                throwError(msg);
            }
            else if (!module.exports.testMode) {
                console.log(chalk.yellow('-------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log();
            }
        });
}

function runPrepublishScript (command) {
    if (!module.exports.testMode) {
        console.log(chalk.yellow('Running prepublish script'));
        console.log(chalk.yellow('-------------------------'));
    }

    return run(command)
        .then(() => {
            if (!module.exports.testMode) {
                console.log(chalk.yellow('-------------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log();
            }
        });
}

function publish (tag) {
    const command = 'npm publish --tag ' + tag;

    if (!module.exports.testMode)
        return run(command).then(() => console.log('\n', emoji.tada, emoji.tada, emoji.tada));

    return command;
}

function getOptions (opts) {
    let rcFileContent = null;
    let rcOpts        = {};

    try {
        rcFileContent = readFile('.publishrc').toString();
    }
    catch (err) {
        // NOTE: we don't have .publishrc file, just ignore the error
    }

    if (rcFileContent) {
        try {
            rcOpts = JSON.parse(rcFileContent);
        }
        catch (err) {
            throwError('.publishrc is not a valid JSON file.');
        }

        opts = defaults(opts, rcOpts);
    }

    return defaults(opts, {
        confirm:            true,
        sensitiveDataAudit: true,
        checkUncommitted:   true,
        checkUntracked:     true,
        validateGitTag:     true,
        validateBranch:     'master',
        tag:                'latest',
        prepublishScript:   null
    });
}

module.exports = function (opts) {
    let pkgVersion = null;

    opts = getOptions(opts);

    return Promise.resolve()
        .then(() => pkgVersion = readPkgVersion())
        .then(() => {
            if (opts.prepublishScript)
                return runPrepublishScript(opts.prepublishScript);
        })
        .then(() => runValidations(opts, pkgVersion))
        .then(() => {
            if (!module.exports.testMode)
                return printReleaseInfo(pkgVersion, opts.tag);
        })
        .then(() => opts.confirm ? confirmPublish() : true)
        .then(ok => {
            if (ok)
                return publish(opts.tag);
        });
};

// Exports for the testing purposes
module.exports.cmd        = cmd;
module.exports.testMode   = false;
module.exports.getOptions = getOptions;
