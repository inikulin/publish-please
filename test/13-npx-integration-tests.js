'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');

const assert = require('assert');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const readFile = require('fs').readFileSync;
const sep = require('path').sep;
const defaults = require('lodash/defaultsDeep');
const unset = require('lodash/unset');
const exec = require('cp-sugar').exec;
const pkgd = require('pkgd');
const mkdirp = require('mkdirp');
const Promise = require('pinkie-promise');
const chalk = require('chalk');
const requireUncached = require('import-fresh');
const packageName = require('./utils/publish-please-version-under-test');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const shouldUsePrePublishOnlyScript = nodeInfos.shouldUsePrePublishOnlyScript;
const lineSeparator = '----------------------------------';

/* eslint-disable max-nested-callbacks */
describe.only('Integration tests', () => {
    // NOTE: mocking confirm function
    let mockConfirm = () => {};

    require('../lib/utils/inquires').confirm = (...args) =>
        mockConfirm(...args);

    const prepublishKey = shouldUsePrePublishOnlyScript
        ? 'prepublishOnly'
        : 'prepublish';

    // NOTE: loading tested code
    const publish = requireUncached('../lib/publish/publish-workflow');
    const getOptions = require('../lib/publish-options').getOptions;
    const echoPublishCommand = 'echo "npm publish"';

    function mkdir(path) {
        return new Promise((resolve, reject) =>
            mkdirp(path, null, (err) => (err ? reject(err) : resolve()))
        );
    }

    function getTestOptions(settings) {
        const disabled = {
            validations: {
                sensitiveData: false,
                uncommittedChanges: false,
                untrackedFiles: false,
                gitTag: false,
                branch: false,
                vulnerableDependencies: false,
            },

            confirm: false,
            publishTag: null,
            prePublishScript: null,
            postPublishScript: null,
        };

        if (settings && settings.remove) unset(disabled, settings.remove);

        return defaults({}, settings && settings.set, disabled);
    }

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
        return del('testing-repo')
            .then(() =>
                exec(
                    'git clone https://github.com/inikulin/testing-repo.git testing-repo'
                )
            )
            .then(() => exec('npm run package'))
            .then(() => process.chdir('testing-repo'))
            .then(() => (process.env.PUBLISH_PLEASE_TEST_MODE = true));
    });

    after(() => delete process.env.PUBLISH_PLEASE_TEST_MODE);

    beforeEach(() =>
        colorGitOutput().then(
            console.log(`${lineSeparator} begin test ${lineSeparator}`)
        ));

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

    describe('npx usage', () => {
        it(`Should be able to use publish-please in dry mode (with no .publishrc config file) with 'npx ${packageName} --dry-run'`, () => {
            return Promise.resolve()
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    const scripts = {};
                    scripts.test = 'echo "running tests ..."';
                    pkg.scripts = scripts;
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => console.log(`> npx ${packageName} --dry-run`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz --dry-run > ./publish01.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish01.log').toString();
                    console.log(publishLog);
                    /* prettier-ignore */
                    assert(publishLog.includes('dry mode activated'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('running tests ...'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('There are uncommitted changes in the working tree.'));
                });
        });

        it(`Should be able to use publish-please in dry mode (with existing .publishrc config file) with 'npx ${packageName} --dry-run'`, () => {
            return Promise.resolve()
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    const scripts = {};
                    scripts.test = 'echo "running tests ..."';
                    pkg.scripts = scripts;
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify({
                            confirm: true,
                            validations: {
                                vulnerableDependencies: false,
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
                .then(() => console.log(`> npx ${packageName} --dry-run`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz --dry-run > ./publish02.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish02.log').toString();
                    console.log(publishLog);
                    /* prettier-ignore */
                    assert(publishLog.includes('dry mode activated'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('running script defined in .publishrc ...'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(publishLog.includes('testing-repo-1.3.77.tgz'));
                    /* prettier-ignore */
                    assert(publishLog.includes("run 'npm pack' to have more details on the package"));
                });
        });

        it(`Should be able to configure publish-please with 'npx ${packageName} config'`, () => {
            return Promise.resolve()
                .then(() => console.log(`> npx ${packageName} config`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz config > ./publish03.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish03.log').toString();
                    console.log(publishLog);
                })
                .then(() => {
                    const publishrc = JSON.parse(
                        readFile('.publishrc').toString()
                    );
                    publishrc.confirm.should.be.true();
                    publishrc.prePublishScript.should.equal('npm test');
                    publishrc.postPublishScript.should.equal('');
                    publishrc.publishCommand.should.equal('npm publish');
                    publishrc.publishTag.should.equal('latest');
                    publishrc.validations.branch.should.equal('master');
                    publishrc.validations.uncommittedChanges.should.be.true();
                    publishrc.validations.untrackedFiles.should.be.true();

                    nodeInfos.isAtLeastNpm6
                        ? publishrc.validations.vulnerableDependencies.should.be.true()
                        : publishrc.validations.vulnerableDependencies.should.be.false();

                    publishrc.validations.sensitiveData.should.be.true();
                    publishrc.validations.gitTag.should.be.true();
                    publishrc.validations.branch.should.equal('master');
                });
        });

        it(`Should be able to start the publishing workflow with 'npx ${packageName}' (no .publishrc config file)`, () => {
            return Promise.resolve()
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish04.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish04.log').toString();
                    console.log(publishLog);
                    return publishLog;
                })
                .then((publishLog) => {
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Error: no test specified'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));

                    /* prettier-ignore */
                    nodeInfos.isAtLeastNpm6
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
                    assert(publishLog.includes('* There are untracked files in the working tree.'));
                    /* prettier-ignore */
                    assert(publishLog.includes("* Latest commit doesn't have git tag."));
                });
        });

        it(`Should be able to run the publishing workflow with 'npx ${packageName}' (with .publishrc config file)`, () => {
            return Promise.resolve()
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    const scripts = {};
                    scripts.test = 'echo "running tests ..."';
                    pkg.scripts = scripts;
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify({
                            confirm: false,
                            validations: {
                                vulnerableDependencies: false,
                                sensitiveData: true,
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
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish05.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish05.log').toString();
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
                    assert(publishLog.includes('Checking for the sensitive data in the working tree'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Command `npm` exited with code'));
                });
        });

        if (!nodeInfos.isAtLeastNpm6) {
            it(`Should abort the publishing workflow with 'npx ${packageName}' when npm version < 6 and vulnerability check is enabled in .publishrc config file)`, () => {
                return Promise.resolve()
                    .then(() => {
                        const pkg = JSON.parse(
                            readFile('package.json').toString()
                        );
                        const scripts = {};
                        scripts.test = 'echo "running tests ..."';
                        pkg.scripts = scripts;
                        writeFile('package.json', JSON.stringify(pkg, null, 2));
                    })
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
                    .then(() => console.log(`> npx ${packageName}`))
                    .then(() =>
                        exec(
                            /* prettier-ignore */
                            `npx ../${packageName.replace('@','-')}.tgz > ./publish06.log`
                        )
                    )
                    .then(() => {
                        const publishLog = readFile(
                            './publish06.log'
                        ).toString();
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

            it(`Should abort the dry mode workflow with 'npx ${packageName} --dry-run' when npm version < 6 and vulnerability check is enabled in .publishrc config file)`, () => {
                return Promise.resolve()
                    .then(() => {
                        const pkg = JSON.parse(
                            readFile('package.json').toString()
                        );
                        const scripts = {};
                        scripts.test = 'echo "running tests ..."';
                        pkg.scripts = scripts;
                        writeFile('package.json', JSON.stringify(pkg, null, 2));
                    })
                    .then(() => {
                        writeFile(
                            '.publishrc',
                            JSON.stringify({
                                confirm: true,
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
                    .then(() => console.log(`> npx ${packageName} --dry-run`))
                    .then(() =>
                        exec(
                            /* prettier-ignore */
                            `npx ../${packageName.replace('@','-')}.tgz --dry-run > ./publish07.log`
                        )
                    )
                    .then(() => {
                        const publishLog = readFile(
                            './publish07.log'
                        ).toString();
                        console.log(publishLog);
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
});
