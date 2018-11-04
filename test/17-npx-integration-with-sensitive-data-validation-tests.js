'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const assert = require('assert');
const del = require('del');
const mkdirp = require('mkdirp');
const writeFile = require('fs').writeFileSync;
const readFile = require('fs').readFileSync;
const exec = require('cp-sugar').exec;
const packageName = require('./utils/publish-please-version-under-test');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const EOL = require('os').EOL;
const pathJoin = require('path').join;
const touch = require('./utils/touch-file-sync');
const lineSeparator = '----------------------------------';

/* eslint-disable max-nested-callbacks */
describe('npx integration tests with sensitive-data validation', () => {
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
        colorGitOutput().then(() =>
            console.log(`${lineSeparator} begin test ${lineSeparator}`)
        ));

    afterEach(() => {
        const projectDir = process.cwd();
        if (projectDir.includes('testing-repo')) {
            return exec('git reset --hard HEAD')
                .then(() => exec('git clean -f -d'))
                .then(() =>
                    console.log(`${lineSeparator} end test ${lineSeparator}\n`)
                );
        }
        console.log('protecting publish-please project against git reset');
        return Promise.resolve().then(() => process.chdir('testing-repo'));
    });

    if (nodeInfos.npmPackHasJsonReporter) {
        it('Should detect and ignore sensitive-data when sensitive-data check is enabled in .publishrc config file', () => {
            return Promise.resolve()
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify(
                            {
                                confirm: false,
                                validations: {
                                    vulnerableDependencies: false,
                                    sensitiveData: {
                                        ignore: ['lib/**/*.tgz'],
                                    },
                                    uncommittedChanges: false,
                                    untrackedFiles: false,
                                    branch: 'master',
                                    gitTag: false,
                                },
                                publishTag: 'latest',
                                prePublishScript:
                                    'echo "running script defined in .publishrc ..."',
                                postPublishScript: false,
                            },
                            null,
                            2
                        )
                    );
                })
                .then(() => {
                    touch(pathJoin(process.cwd(), 'lib', 'yo234.tgz'));
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'test'));
                    touch(
                        pathJoin(process.cwd(), 'lib', 'test', 'yo234.spec.js')
                    );
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'node_modules'));
                    mkdirp.sync(
                        pathJoin(process.cwd(), 'lib', 'node_modules', 'my-app')
                    );
                    touch(
                        pathJoin(
                            process.cwd(),
                            'lib',
                            'node_modules',
                            'my-app',
                            'index.js'
                        )
                    );
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish11.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish11.log').toString();
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
                    assert(publishLog.includes('Checking for the sensitive and non-essential data in the npm package'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo234.tgz'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Sensitive or non essential data found in npm package: lib/node_modules/my-app/index.js'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Sensitive or non essential data found in npm package: lib/test/yo234.spec.js'));
                });
        });

        it('Should detect and ignore sensitive-data when sensitive-data check is enabled in .publishrc config file and package.json has a prepublish script', () => {
            return Promise.resolve()
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify(
                            {
                                confirm: false,
                                validations: {
                                    vulnerableDependencies: false,
                                    sensitiveData: {
                                        ignore: ['lib/**/*.tgz'],
                                    },
                                    uncommittedChanges: false,
                                    untrackedFiles: false,
                                    branch: 'master',
                                    gitTag: false,
                                },
                                publishTag: 'latest',
                                prePublishScript:
                                    'echo "running script defined in .publishrc ..."',
                                postPublishScript: false,
                            },
                            null,
                            2
                        )
                    );
                })
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    // prettier-ignore
                    pkg.dependencies = {
                        'publish-please': '5.0.0',
                    };
                    pkg.scripts = {
                        test: 'gulp travis',
                        'publish-please': 'publish-please',
                        prepublish: 'publish-please guard',
                    };
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    touch(pathJoin(process.cwd(), 'lib', 'yo234.tgz'));
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'test'));
                    touch(
                        pathJoin(process.cwd(), 'lib', 'test', 'yo234.spec.js')
                    );
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'node_modules'));
                    mkdirp.sync(
                        pathJoin(process.cwd(), 'lib', 'node_modules', 'my-app')
                    );
                    touch(
                        pathJoin(
                            process.cwd(),
                            'lib',
                            'node_modules',
                            'my-app',
                            'index.js'
                        )
                    );
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish12.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish12.log').toString();
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
                    assert(publishLog.includes('Checking for the sensitive and non-essential data in the npm package'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo234.tgz'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Sensitive or non essential data found in npm package: lib/node_modules/my-app/index.js'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Sensitive or non essential data found in npm package: lib/test/yo234.spec.js'));
                });
        });

        it('Should ignore sensitive-data when sensitive-data check is disabled in .publishrc config file', () => {
            return Promise.resolve()
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify(
                            {
                                confirm: false,
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
                            },
                            null,
                            2
                        )
                    );
                })
                .then(() => {
                    touch(pathJoin(process.cwd(), 'lib', 'yo234.tgz'));
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'test'));
                    touch(
                        pathJoin(process.cwd(), 'lib', 'test', 'yo234.spec.js')
                    );
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'node_modules'));
                    mkdirp.sync(
                        pathJoin(process.cwd(), 'lib', 'node_modules', 'my-app')
                    );
                    touch(
                        pathJoin(
                            process.cwd(),
                            'lib',
                            'node_modules',
                            'my-app',
                            'index.js'
                        )
                    );
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish13.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish13.log').toString();
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
                    assert(!publishLog.includes('Checking for the sensitive and non-essential data in the npm package'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo234.tgz'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/node_modules/my-app/index.js'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/test/yo234.spec.js'));
                });
        });

        it('Should detect custom .sensitivedata and ignore sensitive-data when sensitive-data check is enabled in .publishrc config file', () => {
            return Promise.resolve()
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify(
                            {
                                confirm: false,
                                validations: {
                                    vulnerableDependencies: false,
                                    sensitiveData: {
                                        ignore: ['**/yo456.tgz'],
                                    },
                                    uncommittedChanges: false,
                                    untrackedFiles: false,
                                    branch: 'master',
                                    gitTag: false,
                                },
                                publishTag: 'latest',
                                prePublishScript:
                                    'echo "running script defined in .publishrc ..."',
                                postPublishScript: false,
                            },
                            null,
                            2
                        )
                    );
                })
                .then(() => {
                    const customSensitiveData = `
                    #-----------------------
                    # yo Files
                    #-----------------------
                    yo/**
                    **/yo/**
                    !**/yo/keepit.js
                    `;
                    writeFile('.sensitivedata', customSensitiveData);
                })
                .then(() => {
                    touch(pathJoin(process.cwd(), 'lib', 'yo234.tgz'));
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'yo'));
                    touch(pathJoin(process.cwd(), 'lib', 'yo', 'yo234.tgz'));
                    touch(pathJoin(process.cwd(), 'lib', 'yo', 'yo456.tgz'));
                    touch(pathJoin(process.cwd(), 'lib', 'yo', 'keepit.js'));
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish14.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish14.log').toString();
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
                    assert(publishLog.includes('Checking for the sensitive and non-essential data in the npm package'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Sensitive or non essential data found in npm package: lib/yo/yo234.tgz'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo234.tgz'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo/yo456.tgz'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Sensitive or non essential data found in npm package: lib/yo/keepit.js'));
                });
        });
    }

    if (!nodeInfos.npmPackHasJsonReporter) {
        it('Should not run sensitive-data valldation when sensitive-data check is enabled in .publishrc config file and npm version < v5.9.0', () => {
            return Promise.resolve()
                .then(() => {
                    writeFile(
                        '.publishrc',
                        JSON.stringify(
                            {
                                confirm: false,
                                validations: {
                                    vulnerableDependencies: false,
                                    sensitiveData: {
                                        ignore: ['lib/**/*.tgz'],
                                    },
                                    uncommittedChanges: false,
                                    untrackedFiles: false,
                                    branch: 'master',
                                    gitTag: false,
                                },
                                publishTag: 'latest',
                                prePublishScript:
                                    'echo "running script defined in .publishrc ..."',
                                postPublishScript: false,
                            },
                            null,
                            2
                        )
                    );
                })
                .then(() => {
                    touch(pathJoin(process.cwd(), 'lib', 'yo234.tgz'));
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'test'));
                    touch(
                        pathJoin(process.cwd(), 'lib', 'test', 'yo234.spec.js')
                    );
                    mkdirp.sync(pathJoin(process.cwd(), 'lib', 'node_modules'));
                    mkdirp.sync(
                        pathJoin(process.cwd(), 'lib', 'node_modules', 'my-app')
                    );
                    touch(
                        pathJoin(
                            process.cwd(),
                            'lib',
                            'node_modules',
                            'my-app',
                            'index.js'
                        )
                    );
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish15.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish15.log').toString();
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
                    assert(publishLog.includes('Checking for the sensitive and non-essential data in the npm package'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Validating branch'));
                    /* prettier-ignore */
                    assert(publishLog.includes('ERRORS'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Cannot check sensitive and non-essential data because npm version'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Either upgrade npm to version 5.9.0 or above, or disable this validation in the configuration file'));
                });
        });
    }
});
