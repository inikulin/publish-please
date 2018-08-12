'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const assert = require('assert');
const copy = require('./utils/copy-file-sync');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const readFile = require('fs').readFileSync;
const exec = require('cp-sugar').exec;
const Promise = require('pinkie-promise');
const packageName = require('./utils/publish-please-version-under-test');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const shouldUsePrePublishOnlyScript = nodeInfos.shouldUsePrePublishOnlyScript;
const lineSeparator = '----------------------------------';

/* eslint-disable max-nested-callbacks */
describe('npm integration tests', () => {
    const prepublishKey = shouldUsePrePublishOnlyScript
        ? 'prepublishOnly'
        : 'prepublish';

    function colorGitOutput() {
        const gitColorCommands = [
            'git config color.branch.current blue',
            'git config color.branch.local blue',
            'git config color.branch.remote blue',
            'git config color.diff.meta blue',
            'git config color.diff.frag blue',
            'git config color.diff.old blue',
            'git config color.diff.new blue',
            'git config color.status.added blue',
            'git config color.status.changed blue',
            'git config color.status.untracked blue',
        ];

        return gitColorCommands.reduce(
            (p, c) => p.then(() => exec(c)),
            Promise.resolve()
        );
    }
    before(() => {
        const projectDir = process.cwd();
        if (projectDir.includes('testing-repo')) {
            return Promise.resolve()
                .then(() => process.chdir('..'))
                .then(() => exec('npm run package'))
                .then(() => del('testing-repo'))
                .then(() =>
                    exec(
                        'git clone https://github.com/inikulin/testing-repo.git testing-repo'
                    )
                )
                .then(() => process.chdir('testing-repo'))
                .then(() => console.log(`tests will run in ${process.cwd()}`))
                .then(() => (process.env.PUBLISH_PLEASE_TEST_MODE = true));
        }

        return del('testing-repo')
            .then(() => exec('npm run package'))
            .then(() =>
                exec(
                    'git clone https://github.com/inikulin/testing-repo.git testing-repo'
                )
            )
            .then(() => process.chdir('testing-repo'))
            .then(() => console.log(`tests will run in ${process.cwd()}`))
            .then(() => (process.env.PUBLISH_PLEASE_TEST_MODE = true));
    });

    after(() => delete process.env.PUBLISH_PLEASE_TEST_MODE);

    beforeEach(() =>
        colorGitOutput()
            .then(() =>
                console.log(`${lineSeparator} begin test ${lineSeparator}`)
            )
            .then(() => copy('../.auditignore', './.auditignore')));
    afterEach(() => {
        const projectDir = process.cwd();
        if (projectDir.includes('testing-repo')) {
            return exec('git reset --hard HEAD')
                .then(exec('git clean -f -d'))
                .then(
                    console.log(`${lineSeparator} end test ${lineSeparator}\n`)
                );
        }
        console.log('protecting publish-please project against git reset');
        return Promise.resolve().then(process.chdir('testing-repo'));
    });

    it('Should not install globally', () => {
        return Promise.resolve()
            .then(() => console.log(`> npm install -g ${packageName}`))
            .then(() =>
                exec(`npm install -g ../${packageName.replace('@', '-')}.tgz`)
            )
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch((err) =>
                assert(err.message.indexOf('node lib/pre-install.js') > -1)
            );
    });

    it('Should install locally', () => {
        return Promise.resolve()
            .then(() => console.log(`> npm install --save-dev ${packageName}`))
            .then(() =>
                exec(
                    `npm install --save-dev ../${packageName.replace(
                        '@',
                        '-'
                    )}.tgz`
                )
            )
            .then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(
                    cfg.scripts['publish-please'],
                    'publish-please'
                );
                assert.strictEqual(
                    cfg.scripts[prepublishKey],
                    'publish-please guard'
                );
                const publishrc = JSON.parse(readFile('.publishrc').toString());
                assert(publishrc.confirm);
                assert.strictEqual(publishrc.prePublishScript, 'npm test');
                assert.strictEqual(publishrc.postPublishScript, '');
                assert.strictEqual(publishrc.publishCommand, 'npm publish');
                assert.strictEqual(publishrc.publishTag, 'latest');
                assert.strictEqual(publishrc.validations.branch, 'master');
                assert(publishrc.validations.uncommittedChanges);
                assert(publishrc.validations.untrackedFiles);

                /* prettier-ignore */
                nodeInfos.npmAuditHasJsonReporter
                    ? assert(publishrc.validations.vulnerableDependencies === true)
                    : assert(publishrc.validations.vulnerableDependencies === false);

                assert(publishrc.validations.sensitiveData);
                assert(publishrc.validations.gitTag);
                assert.strictEqual(publishrc.validations.branch, 'master');
            });
    });

    it('Should be able to use publish-please after installing locally', () => {
        return Promise.resolve()
            .then(() => console.log(`> npm install --save-dev ${packageName}`))
            .then(() =>
                exec(
                    /* prettier-ignore */
                    `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
                )
            )
            .then(() => console.log('> npm run publish-please'))
            .then(() => exec('npm run publish-please > ./publish01.log'))
            .then(() => {
                const publishLog = readFile('./publish01.log').toString();
                console.log(publishLog);
                /* prettier-ignore */
                assert(publishLog.includes('Running pre-publish script'));
                /* prettier-ignore */
                assert(publishLog.includes('Running validations'));
                /* prettier-ignore */
                assert(publishLog.includes('Error: no test specified'));

                /* prettier-ignore */
                nodeInfos.npmAuditHasJsonReporter
                    ? assert(publishLog.includes('Checking for the vulnerable dependencies'))
                    : assert(!publishLog.includes('Checking for the vulnerable dependencies'));

                /* prettier-ignore */
                assert(publishLog.includes('Checking for the uncommitted changes'));
                /* prettier-ignore */
                assert(publishLog.includes('Checking for the untracked files'));
                /* prettier-ignore */
                assert(publishLog.includes('Checking for the sensitive data in the working tree'));
                /* prettier-ignore */
                assert(publishLog.includes('Validating branch'));
                /* prettier-ignore */
                assert(publishLog.includes('Validating git tag'));
                /* prettier-ignore */
                assert(publishLog.includes('ERRORS'));
                /* prettier-ignore */
                assert(publishLog.includes('* There are uncommitted changes in the working tree.'));
                /* prettier-ignore */
                assert(publishLog.includes('* There are untracked files in the working tree.'));
                /* prettier-ignore */
                assert(publishLog.includes("* Latest commit doesn't have git tag."));
            });
    });

    it('Should be able to run publish-please in dry mode after installing locally', () => {
        return Promise.resolve()
            .then(() => {
                console.log('> setting .auditignore with content:');
                console.log(readFile('.auditignore').toString());
                console.log('');
            })
            .then(() => console.log(`> npm install --save-dev ${packageName}`))
            .then(() =>
                exec(
                    /* prettier-ignore */
                    `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
                )
            )
            .then(() =>
                console.log('> edit .publishrc to disable blocking validations')
            )
            .then(() => {
                const publishrc = JSON.parse(readFile('.publishrc').toString());
                publishrc.validations.uncommittedChanges = false;
                publishrc.validations.untrackedFiles = false;
                publishrc.validations.gitTag = false;
                writeFile('.publishrc', JSON.stringify(publishrc));
                return publishrc;
            })
            .then((publishrc) => {
                console.log('');
                console.log(publishrc);
                console.log('');
            })
            .then(() => console.log('> npm run publish-please --dry-run'))
            .then(() =>
                exec('npm run publish-please --dry-run > ./publish02.log')
            )
            .then(() => {
                const publishLog = readFile('./publish02.log').toString();
                console.log(publishLog);
                /* prettier-ignore */
                assert(publishLog.includes('dry mode activated'));
                /* prettier-ignore */
                assert(publishLog.includes('Running pre-publish script'));
                /* prettier-ignore */
                assert(publishLog.includes('Running validations'));

                /* prettier-ignore */
                nodeInfos.npmAuditHasJsonReporter
                    ? assert(publishLog.includes('Checking for the vulnerable dependencies'))
                    : assert(!publishLog.includes('Checking for the vulnerable dependencies'));

                /* prettier-ignore */
                assert(publishLog.includes('Release info'));
                /* prettier-ignore */
                assert(publishLog.includes('testing-repo-1.3.77.tgz'));
                /* prettier-ignore */
                assert(publishLog.includes("run 'npm pack' to have more details on the package"));
            });
    });

    if (!nodeInfos.npmAuditHasJsonReporter) {
        it('Should abort the publishing workflow when npm version < 6.1.0 and vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
                .then(() =>
                    console.log(`> npm install --save-dev ${packageName}`)
                )
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
                    )
                )
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify({
                            confirm: false,
                            validations: {
                                vulnerableDependencies: true,
                                sensitiveData: false,
                                uncommittedChanges: false,
                                untrackedFiles: false,
                                branch: 'master',
                                gitTag: false,
                            },
                            publishTag: 'latest',
                            prePublishScript:
                                'echo "running script defined in .publishrc ..."',
                            postPublishScript: false,
                        })
                    );
                })
                .then(() => console.log('> npm run publish-please'))
                .then(() => exec('npm run publish-please > ./publish06.log'))
                .then(() => {
                    const publishLog = readFile('./publish06.log').toString();
                    console.log(publishLog);
                    return publishLog;
                })
                .then((publishLog) => {
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('running script defined in .publishrc ...'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Checking for the vulnerable dependencies'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Cannot check vulnerable dependencies'));
                });
        });

        it('Should abort the dry-mode workflow when npm version < 6.1.0 and vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
                .then(() =>
                    console.log(`> npm install --save-dev ${packageName}`)
                )
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
                    )
                )
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify({
                            confirm: false,
                            validations: {
                                vulnerableDependencies: true,
                                sensitiveData: false,
                                uncommittedChanges: false,
                                untrackedFiles: false,
                                branch: 'master',
                                gitTag: false,
                            },
                            publishTag: 'latest',
                            prePublishScript:
                                'echo "running script defined in .publishrc ..."',
                            postPublishScript: false,
                        })
                    );
                })
                .then(() => console.log('> npm run publish-please --dry-run'))
                .then(() =>
                    exec('npm run publish-please --dry-run > ./publish07.log')
                )
                .then(() => {
                    const publishLog = readFile('./publish07.log').toString();
                    console.log(publishLog);
                    return publishLog;
                })
                .then((publishLog) => {
                    /* prettier-ignore */
                    assert(publishLog.includes('dry mode activated'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('running script defined in .publishrc ...'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Checking for the vulnerable dependencies'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Cannot check vulnerable dependencies'));
                });
        });
    }
});
