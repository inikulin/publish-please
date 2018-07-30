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
const lineSeparator =
    '---------------------------------------------------------------------';

/* eslint-disable max-nested-callbacks */
describe('Integration tests', () => {
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

    beforeEach(() => colorGitOutput().then(console.log(lineSeparator)));

    afterEach(() => {
        const projectDir = process.cwd();
        if (projectDir.includes('testing-repo')) {
            return exec('git reset --hard HEAD')
                .then(exec('git clean -f -d'))
                .then(console.log(lineSeparator));
        }
        console.log('protecting publish-please project against git reset');
        return Promise.resolve().then(process.chdir('testing-repo'));
    });

    describe('package.json', () => {
        it('Should validate package.json existence', () =>
            exec('git checkout no-package-json')
                .then(() => publish(getTestOptions()))
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        "package.json file doesn't exist."
                    )
                ));
    });

    describe('.publishrc', () => {
        it('Should use options from .publishrc file', () => {
            writeFile(
                '.publishrc',
                JSON.stringify({
                    confirm: false,
                    validations: {
                        sensitiveData: false,
                        uncommittedChanges: true,
                        untrackedFiles: true,
                    },
                })
            );

            const opts = getOptions({
                validations: {
                    uncommittedChanges: false,
                    sensitiveData: false,
                    untrackedFiles: false,
                },
            });

            assert(!opts.confirm);
            assert.strictEqual(opts.prePublishScript, 'npm test');
            assert.strictEqual(opts.postPublishScript, '');
            assert.strictEqual(opts.publishCommand, 'npm publish');
            assert.strictEqual(opts.publishTag, 'latest');
            assert.strictEqual(opts.validations.branch, 'master');
            assert(!opts.validations.uncommittedChanges);
            assert(!opts.validations.untrackedFiles);
        });

        it('Should expect .publishrc to be a valid JSON file', () => {
            writeFile('.publishrc', 'yoyo123');

            try {
                getOptions();
            } catch (err) {
                assert.strictEqual(
                    err.message,
                    '.publishrc is not a valid JSON file.'
                );
            }
        });
    });

    describe('Branch validation', () => {
        it('Should expect `master` branch by default', () =>
            exec('git checkout some-branch')
                .then(() =>
                    publish(
                        getTestOptions({
                            remove: 'validations.branch',
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        "  * Expected branch to be 'master', but it was 'some-branch'."
                    )
                ));

        it('Should validate the branch set in the configuration file', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    branch: 'no-package-json',
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        "  * Expected branch to be 'no-package-json', but it was 'master'."
                    )
                ));

        it('Should expect the latest commit in the branch', () =>
            exec('git checkout 15a1ef78338cf1fa60c318828970b2b3e70004d1')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    branch: 'master',
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    const msgRe = /^ {2}\* Expected branch to be 'master', but it was '\((?:HEAD )?detached (?:from|at) 15a1ef7\)'.$/;

                    assert(msgRe.test(err.message));
                }));

        it('Should pass branch validation', () =>
            exec('git checkout some-branch').then(() =>
                publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                branch: 'some-branch',
                            },
                        },
                    })
                )
            ));

        it('Should not validate if branch-validation is disabled', () =>
            exec('git checkout some-branch').then(() =>
                publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                branch: false,
                            },
                        },
                    })
                )
            ));
    });

    describe('Git tag validation', () => {
        afterEach(() => exec('git tag | xargs git tag -d'));

        it('Should expect git tag to match version', () =>
            exec('git checkout master')
                .then(() => exec('git tag v0.0.42'))
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    gitTag: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        "  * Expected git tag to be '1.3.77' or 'v1.3.77', but it was 'v0.0.42'."
                    )
                ));

        it('Should expect git tag to exist', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    gitTag: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        "  * Latest commit doesn't have git tag."
                    )
                ));

        it('Should pass validation', () =>
            exec('git checkout master')
                .then(() => exec('git tag v1.3.77'))
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    gitTag: true,
                                },
                            },
                        })
                    )
                ));

        it('Should not validate if tag-validation is disabled', () =>
            exec('git checkout master')
                .then(() => exec('git tag v0.0.42'))
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    tag: false,
                                },
                            },
                        })
                    )
                ));
    });

    describe('Uncommitted changes check', () => {
        it('Should expect no uncommitted changes in the working tree', () =>
            exec('git checkout master')
                .then(() => {
                    writeFile('README.md', 'Yo!');

                    return publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    uncommittedChanges: true,
                                },
                            },
                        })
                    );
                })
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        '  * There are uncommitted changes in the working tree.'
                    )
                ));

        it('Should pass validation if uncommittedChanges-validation is disabled', () =>
            exec('git checkout master').then(() => {
                writeFile('README.md', 'Yo!');

                return publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                uncommittedChanges: false,
                            },
                        },
                    })
                );
            }));

        it('Should pass validation', () =>
            exec('git checkout master').then(() =>
                publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                uncommittedChanges: true,
                            },
                        },
                    })
                )
            ));
    });

    describe('Untracked files check', () => {
        it('Should expect no untracked files in the working tree', () =>
            exec('git checkout master')
                .then(() => {
                    writeFile('test-file', 'Yo!');

                    return publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    untrackedFiles: true,
                                },
                            },
                        })
                    );
                })
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        '  * There are untracked files in the working tree.'
                    )
                ));

        it('Should pass validation if untrackedFiles-validation is disabled', () =>
            exec('git checkout master').then(() => {
                writeFile('test-file', 'Yo!');

                return publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                untrackedFiles: false,
                            },
                        },
                    })
                );
            }));

        it('Should pass validation', () =>
            exec('git checkout master').then(() =>
                publish(
                    getTestOptions({
                        set: {
                            publishCommand: echoPublishCommand,
                            validations: {
                                untrackedFiles: true,
                            },
                        },
                    })
                )
            ));
    });

    describe('Sensitive information audit', () => {
        it('Should fail if finds sensitive information', () =>
            exec('git checkout master')
                .then(() => mkdir('test'))
                .then(() => {
                    writeFile('lib/schema.rb', 'test');
                    writeFile('lib/database.yml', 'test');
                    writeFile('test/database.yml', 'test');
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    sensitiveData: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        '  * Sensitive data found in the working tree:\n' +
                            '    invalid filename lib/database.yml\n' +
                            '     - Potential Ruby On Rails database configuration file\n' +
                            '     - Might contain database credentials.\n' +
                            '    invalid filename lib/schema.rb\n' +
                            '     - Ruby On Rails database schema file\n' +
                            '     - Contains information on the database schema of a Ruby On Rails application.'
                    )
                ));

        it('Should not perform check for files specified in opts.ignore', () =>
            exec('git checkout master')
                .then(() => mkdir('test'))
                .then(() => {
                    writeFile('lib/schema.rb', 'test');
                    writeFile('lib/1.keychain', 'test');
                    writeFile('lib/2.keychain', 'test');
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    sensitiveData: {
                                        ignore: [
                                            'lib/schema.rb',
                                            'lib/*.keychain',
                                        ],
                                    },
                                },
                            },
                        })
                    )
                ));

        it('Should not perform check if sensitiveData-validation is disabled', () =>
            exec('git checkout master')
                .then(() => mkdir('test'))
                .then(() => {
                    writeFile('schema.rb', 'test');
                    writeFile('test/database.yml', 'test');
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    sensitiveData: false,
                                },
                            },
                        })
                    )
                ));
    });

    describe('Node security project audit', () => {
        it('Should fail if there are vulnerable dependencies', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {
                        ms: '0.7.0',
                    };
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert(err.message.indexOf('Vulnerability found') > -1)
                ));
        ['publish-please@2.4.1', 'testcafe@0.19.2'].forEach(function(
            dependency
        ) {
            const name = dependency.split('@')[0];
            const version = dependency.split('@')[1];
            it(`Should fail on transitive dependency inside ${dependency}`, () =>
                exec('git checkout master')
                    .then(() => pkgd())
                    .then((pkgInfo) => {
                        pkgInfo.cfg.dependencies = {};
                        pkgInfo.cfg.dependencies[`${name}`] = `${version}`;
                        writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                    })
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    validations: {
                                        vulnerableDependencies: true,
                                    },
                                },
                            })
                        )
                    )
                    .then(() => {
                        throw new Error('Promise rejection expected');
                    })
                    .catch((err) =>
                        assert(
                            // prettier-ignore
                            err.message.indexOf(`Vulnerability found in ${chalk.bold(dependency)}`) > -1
                        )
                    ));
        });

        ['lodash@4.16.4', 'ms@0.7.0'].forEach(function(dependency) {
            const name = dependency.split('@')[0];
            const version = dependency.split('@')[1];
            it(`Should fail on ${dependency} as a direct dependency`, () =>
                exec('git checkout master')
                    .then(() => pkgd())
                    .then((pkgInfo) => {
                        pkgInfo.cfg.dependencies = {};
                        pkgInfo.cfg.dependencies[`${name}`] = `${version}`;
                        writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                    })
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    validations: {
                                        vulnerableDependencies: true,
                                    },
                                },
                            })
                        )
                    )
                    .then(() => {
                        throw new Error('Promise rejection expected');
                    })
                    .catch((err) =>
                        assert(
                            // prettier-ignore
                            err.message.indexOf(`Vulnerability found in ${chalk.red.bold(dependency)}`) > -1
                        )
                    ));
        });

        it('Should respect exceptions configured in .nsprc file', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {};
                    pkgInfo.cfg.dependencies['lodash'] = '4.16.4';
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                    writeFile(
                        '.nsprc',
                        JSON.stringify({
                            exceptions: [
                                'https://nodesecurity.io/advisories/577',
                            ],
                        })
                    );
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                ));

        it('Should skip exceptions configured in .nsprc file with bad format', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {};
                    pkgInfo.cfg.dependencies['lodash'] = '4.16.4';
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                    writeFile(
                        '.nsprc',
                        JSON.stringify({
                            exceptions:
                                'https://nodesecurity.io/advisories/577',
                        })
                    );
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert(
                        // prettier-ignore
                        err.message.indexOf(`Vulnerability found in ${chalk.red.bold('lodash@4.16.4')}`) > -1
                    )
                ));

        ['lodash@4.17.5', 'ms@0.7.1'].forEach(function(dependency) {
            const name = dependency.split('@')[0];
            const version = dependency.split('@')[1];
            it(`Should not fail on ${dependency} as a direct dependency`, () =>
                exec('git checkout master')
                    .then(() => pkgd())
                    .then((pkgInfo) => {
                        pkgInfo.cfg.dependencies = {};
                        pkgInfo.cfg.dependencies[`${name}`] = `${version}`;
                        writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                    })
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    publishCommand: echoPublishCommand,
                                    validations: {
                                        vulnerableDependencies: true,
                                    },
                                },
                            })
                        )
                    ));
        });

        it('Should not fail if there is no vulnerable dependency', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {
                        ms: '0.7.1',
                    };
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                ));

        it(`Should not fail on transitive dependency inside ${packageName}`, () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {};
                    // TODO: resolve vulnerability on 'ban-sensitive-files' dependency
                    // pkgInfo.cfg.dependencies['ban-sensitive-files'] = '1.9.2';
                    pkgInfo.cfg.dependencies['chalk'] = '2.4.1';
                    pkgInfo.cfg.dependencies['cp-sugar'] = '^1.0.0';
                    pkgInfo.cfg.dependencies['elegant-status'] = '1.1.0';
                    pkgInfo.cfg.dependencies['globby'] = '8.0.1';
                    pkgInfo.cfg.dependencies['inquirer'] = '4.0.2';
                    pkgInfo.cfg.dependencies['lodash'] = '4.17.10';
                    pkgInfo.cfg.dependencies['node-emoji'] = '1.8.1';
                    // TODO: resolve vulnerability on 'nsp' dependency
                    // pkgInfo.cfg.dependencies['nsp'] = '3.2.1';
                    pkgInfo.cfg.dependencies['pinkie-promise'] = '^2.0.1';
                    pkgInfo.cfg.dependencies['pkgd'] = '^1.1.2';
                    pkgInfo.cfg.dependencies['promisify-event'] = '^1.0.0';
                    pkgInfo.cfg.dependencies['read-pkg'] = '3.0.0';
                    pkgInfo.cfg.dependencies['semver'] = '5.5.0';
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                ));

        it('Should fail with two errors on lodash@4.16.4 and ms@0.7.0', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {
                        ms: '0.7.0',
                        lodash: '4.16.4',
                    };
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: {
                                    vulnerableDependencies: true,
                                },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    const errors = err.message
                        .split('\n')
                        .filter((msg) => msg.startsWith('  * '));
                    return assert(errors.length === 2);
                }));

        it('Should not perform check if vulnerableDependencies-validation is disabled', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = {
                        ms: '0.7.0',
                    };

                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                validations: {
                                    vulnerableDependencies: false,
                                },
                            },
                        })
                    )
                ));
    });

    describe('Prepublish script', () => {
        it('Should fail if prepublish script fail', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                prePublishScript: 'npm run unknown',
                                publishCommand: echoPublishCommand,
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        'Command `npm` exited with code 1.'
                    )
                ));

        it('Should run prepublish script', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                prePublishScript: 'git mv README.md test-file',
                            },
                        })
                    )
                )
                .then(() => assert(readFile('test-file'))));
    });

    describe('Postpublish script', () => {
        it('Should fail if postpublish script fail', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                postPublishScript: 'npm run unknown',
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        'Command `npm` exited with code 1.'
                    )
                ));

        it('Should run postpublish script', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                postPublishScript: 'git mv README.md test-file',
                            },
                        })
                    )
                )
                .then(() => assert(readFile('test-file'))));

        it('Should not run postpublish script if publishing was failed', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                prePublishScript: 'echo npm test',
                                publishCommand: 'npm run unknown',
                                postPublishScript: 'git mv README.md test-file',
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert(
                        err.message.indexOf(
                            'Command `npm` exited with code 1'
                        ) > -1
                    )
                )
                .catch(() => assert.throws(() => readFile('test-file'))));

        it('Should not run postpublish script if pre-publish script was failed', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                prePublishScript: 'npm run unknown',
                                publishCommand: echoPublishCommand,
                                postPublishScript: 'git mv README.md test-file',
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert(
                        err.message.indexOf(
                            'Command `npm` exited with code 1'
                        ) > -1
                    )
                )
                .catch(() => assert.throws(() => readFile('test-file'))));
    });

    describe('Custom publish command', () => {
        it('Should execute a custom publish command if it is specified', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                            },
                            remove: 'publishTag',
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        `${echoPublishCommand} --tag latest --with-publish-please`
                    )
                ));

        it('Should execute a custom publish command with a custom tag', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                publishTag: 'alpha',
                            },
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        `${echoPublishCommand} --tag alpha --with-publish-please`
                    )
                ));
    });

    describe('Publish tag', () => {
        it('Should publish with the given tag', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                                publishTag: 'alpha',
                            },
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        `${echoPublishCommand} --tag alpha --with-publish-please`
                    )
                ));

        it('Should publish with the `latest` tag by default', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: echoPublishCommand,
                            },
                            remove: 'publishTag',
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        `${echoPublishCommand} --tag latest --with-publish-please`
                    )
                ));
    });

    describe('Guard', () => {
        const GUARD_ERROR = 'node ../bin/publish-please.js guard';

        beforeEach(() => {
            const pkg = JSON.parse(readFile('package.json').toString());

            pkg.scripts = {};
            pkg.scripts[prepublishKey] = 'node ../bin/publish-please.js guard';
            writeFile('package.json', JSON.stringify(pkg));
        });

        it('Should prevent publishing without special flag', () =>
            exec('npm publish')
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    console.log(err.message);
                    return assert(err.message.indexOf(GUARD_ERROR) >= 0);
                }));

        it('Should allow publishing with special flag', () =>
            exec('npm publish --with-publish-please')
                // NOTE: it will reject anyway because this package version already
                // published or test host don't have permissions to do that
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    // prettier-ignore
                    assert(
                        err.message.indexOf('You do not have permission to publish') > -1 ||
                        err.message.indexOf('auth required for publishing') > -1 ||
                        err.message.indexOf('operation not permitted') > -1
                    );
                }));

        it('Should not fail on `install`', () => exec('npm install'));
    });

    describe('Init', () => {
        beforeEach(() => {
            return mkdir(
                'node_modules/publish-please/lib'.replace(/\\|\//g, sep)
            )
                .then(() =>
                    exec('cp -r ../lib/* node_modules/publish-please/lib')
                )
                .then(() => {
                    process.env['npm_config_argv'] = '';
                });
        });

        it('Should add hooks to package.json', () =>
            exec('node node_modules/publish-please/lib/post-install.js').then(
                () => {
                    const cfg = JSON.parse(readFile('package.json').toString());

                    assert.strictEqual(
                        cfg.scripts['publish-please'],
                        'publish-please'
                    );
                    assert.strictEqual(
                        cfg.scripts[prepublishKey],
                        'publish-please guard'
                    );
                }
            ));

        it('Should add guard gracefully', () => {
            const pkg = {};
            pkg.scripts = {};
            pkg.scripts[prepublishKey] = 'yo';
            writeFile('package.json', JSON.stringify(pkg));

            return exec(
                'node node_modules/publish-please/lib/post-install.js'
            ).then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(
                    cfg.scripts[prepublishKey],
                    'publish-please guard && yo'
                );
            });
        });

        it("Should not modify config if it's already modified", () =>
            exec('node node_modules/publish-please/lib/post-install.js')
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    pkg.scripts[prepublishKey] = 'yo';
                    writeFile('package.json', JSON.stringify(pkg));
                    return Promise.resolve();
                })
                .then(() =>
                    exec('node node_modules/publish-please/lib/post-install.js')
                )
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    assert.strictEqual(pkg.scripts[prepublishKey], 'yo');
                }));

        it("Should exit with error if package.json doesn't exists", () =>
            del('package.json')
                .then(() =>
                    exec('node node_modules/publish-please/lib/post-install.js')
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => assert.strictEqual(err.code, 1)));
    });

    describe('Confirmation', () => {
        describe('Passed', () => {
            let confirmCalled = false;

            before(() => {
                mockConfirm = () => {
                    confirmCalled = true;

                    return Promise.resolve(true);
                };
            });

            beforeEach(() => (confirmCalled = false));

            after(() => (mockConfirm = () => {}));

            it('Should call confirmation if opts.confirm is true', () =>
                exec('git checkout master')
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    publishCommand: echoPublishCommand,
                                    confirm: true,
                                },
                            })
                        )
                    )
                    .then((npmCmd) => {
                        assert.ok(confirmCalled);
                        assert.strictEqual(
                            npmCmd,
                            `${echoPublishCommand} --tag null --with-publish-please`
                        );
                    }));
        });

        describe('Failed', () => {
            before(() => (mockConfirm = () => Promise.resolve(false)));

            after(() => (mockConfirm = () => {}));

            it('Should return empty string if publish was not confirmed', () =>
                exec('git checkout master')
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    publishCommand: echoPublishCommand,
                                    confirm: true,
                                },
                            })
                        )
                    )
                    .then((npmCmd) => assert.strictEqual(npmCmd, '')));

            it('Should not run postpublish script if publishing was not confirmed', () =>
                exec('git checkout master')
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    confirm: true,
                                    publishCommand: echoPublishCommand,
                                    postPublishScript:
                                        'git mv README.md test-file',
                                },
                            })
                        )
                    )
                    .then((npmCmd) => {
                        assert.strictEqual(npmCmd, '');
                        assert.throws(() => readFile('test-file'));
                    }));
        });
    });

    describe('Package installation', () => {
        it(`Should not install ${packageName} globally`, () => {
            return exec(
                `npm install -g ../${packageName.replace('@', '-')}.tgz`
            )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert(err.message.indexOf('node lib/pre-install.js') > -1)
                );
        });

        it(`Should install ${packageName} locally`, () => {
            return exec(
                `npm install --save-dev ../${packageName.replace('@', '-')}.tgz`
            ).then(() => {
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
                nodeInfos.isAtLeastNpm6
                    ? assert(publishrc.validations.vulnerableDependencies === true)
                    : assert(publishrc.validations.vulnerableDependencies === false);

                assert(publishrc.validations.sensitiveData);
                assert(publishrc.validations.gitTag);
                assert.strictEqual(publishrc.validations.branch, 'master');
            });
        });

        it(`Should be able to use publish-please just after installing ${packageName} locally`, () => {
            return exec(
                /* prettier-ignore */
                `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
            )
                .then(() => exec('npm run publish-please > ./publish.log'))
                .then(() => {
                    const publishLog = readFile('./publish.log').toString();
                    console.log(publishLog);
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Error: no test specified'));

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
                    assert(publishLog.includes('* There are uncommitted changes in the working tree.'));
                    /* prettier-ignore */
                    assert(publishLog.includes('* There are untracked files in the working tree.'));
                    /* prettier-ignore */
                    assert(publishLog.includes("* Latest commit doesn't have git tag."));
                });
        });

        it(`Should be able to use publish-please in dry mode just after installing ${packageName} locally`, () => {
            return exec(
                /* prettier-ignore */
                `npm install --save-dev ../${packageName.replace('@','-')}.tgz`
            )
                .then(() => {
                    const publishrc = JSON.parse(
                        readFile('.publishrc').toString()
                    );
                    publishrc.validations.uncommittedChanges = false;
                    publishrc.validations.untrackedFiles = false;
                    publishrc.validations.gitTag = false;
                    writeFile('.publishrc', JSON.stringify(publishrc));
                    return publishrc;
                })
                .then(() =>
                    exec('npm run publish-please --dry-run > ./publish.log')
                )
                .then(() => {
                    const publishLog = readFile('./publish.log').toString();
                    console.log(publishLog);
                    /* prettier-ignore */
                    assert(publishLog.includes('Running pre-publish script'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Running validations'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(publishLog.includes('testing-repo-1.3.77.tgz'));
                    /* prettier-ignore */
                    assert(publishLog.includes("run 'npm pack' to have more details on the package"));
                });
        });
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
                    assert(publishLog.includes('Checking for the vulnerable dependencies'));

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
                                vulnerableDependencies: true,
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
                    assert(publishLog.includes('Checking for the vulnerable dependencies'));
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
    });
});
