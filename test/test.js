'use strict';

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

/* eslint-disable max-nested-callbacks */
describe('Integration tests', () => {
    // NOTE: mocking confirm function
    let mockConfirm = () => {};

    require('../lib/utils/inquires').confirm = (...args) =>
        mockConfirm(...args);

    // NOTE: loading tested code
    const publish = requireUncached('../lib/publish');
    const getOptions = require('../lib/publish').getOptions;

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
        require('../lib/publish').testMode = true;
        require('../lib/validations').testMode = true;

        return del('testing-repo')
            .then(() =>
                exec(
                    'git clone https://github.com/inikulin/testing-repo.git testing-repo'
                )
            )
            .then(() => exec('npm run package'))
            .then(() => process.chdir('testing-repo'));
    });

    beforeEach(() => colorGitOutput());

    afterEach(() => {
        const projectDir = process.cwd();
        if (projectDir.includes('testing-repo')) {
            return exec('git reset --hard HEAD').then(exec('git clean -f -d'));
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
                    publish(getTestOptions({ remove: 'validations.branch' }))
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

        it('Should validate branch passed via parameter', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: { validations: { branch: 'no-package-json' } },
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
                            set: { validations: { branch: 'master' } },
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

        it('Should pass validation', () =>
            exec('git checkout some-branch').then(() =>
                publish(
                    getTestOptions({
                        set: { validations: { branch: 'some-branch' } },
                    })
                )
            ));

        it('Should not validate if option is disabled', () =>
            exec('git checkout some-branch').then(() =>
                publish(getTestOptions())
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
                            set: { validations: { gitTag: true } },
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
                            set: { validations: { gitTag: true } },
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
                            set: { validations: { gitTag: true } },
                        })
                    )
                ));

        it('Should not validate if option is disabled', () =>
            exec('git checkout master')
                .then(() => exec('git tag v0.0.42'))
                .then(() => publish(getTestOptions())));
    });

    describe('Uncommitted changes check', () => {
        it('Should expect no uncommitted changes in the working tree', () =>
            exec('git checkout master')
                .then(() => {
                    writeFile('README.md', 'Yo!');

                    return publish(
                        getTestOptions({
                            set: { validations: { uncommittedChanges: true } },
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

        it('Should pass validation if option is disabled', () =>
            exec('git checkout master').then(() => {
                writeFile('README.md', 'Yo!');

                return publish(getTestOptions());
            }));

        it('Should pass validation', () =>
            exec('git checkout master').then(() =>
                publish(
                    getTestOptions({
                        set: { validations: { uncommittedChanges: true } },
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
                            set: { validations: { untrackedFiles: true } },
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

        it('Should pass validation if option is disabled', () =>
            exec('git checkout master').then(() => {
                writeFile('test-file', 'Yo!');

                return publish(getTestOptions());
            }));

        it('Should pass validation', () =>
            exec('git checkout master').then(() =>
                publish(
                    getTestOptions({
                        set: { validations: { untrackedFiles: true } },
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
                            set: { validations: { sensitiveData: true } },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    assert.strictEqual(
                        err.message,
                        '  * Sensitive data found in the working tree:\n' +
                            '    invalid filename lib/database.yml\n' +
                            '     - Potential Ruby On Rails database configuration file\n' +
                            '     - Might contain database credentials.\n' +
                            '    invalid filename lib/schema.rb\n' +
                            '     - Ruby On Rails database schema file\n' +
                            '     - Contains information on the database schema of a Ruby On Rails application.'
                    );
                }));

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

        it('Should not perform check if option is disabled', () =>
            exec('git checkout master')
                .then(() => mkdir('test'))
                .then(() => {
                    writeFile('schema.rb', 'test');
                    writeFile('test/database.yml', 'test');
                })
                .then(() => publish(getTestOptions())));
    });

    describe('Node security project audit', () => {
        it('Should fail if there are vulnerable dependencies', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = { ms: '0.7.0' };
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: { vulnerableDependencies: true },
                            },
                        })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    assert(err.message.indexOf('Vulnerability found') > -1);
                }));
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
                    .catch((err) => {
                        assert(
                            // prettier-ignore
                            err.message.indexOf(`Vulnerability found in ${chalk.bold(dependency)}`) > -1
                        );
                    }));
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
                    .catch((err) => {
                        assert(
                            // prettier-ignore
                            err.message.indexOf(`Vulnerability found in ${chalk.red.bold(dependency)}`) > -1
                        );
                    }));
        });

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
                    pkgInfo.cfg.dependencies = { ms: '0.7.1' };
                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: { vulnerableDependencies: true },
                            },
                        })
                    )
                ));

        it('Should not fail on transitive dependency inside publish-please vNext', () =>
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
                                validations: { vulnerableDependencies: true },
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
                                validations: { vulnerableDependencies: true },
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
                    assert(errors.length === 2);
                }));

        it('Should not perform check if option is disabled', () =>
            exec('git checkout master')
                .then(() => pkgd())
                .then((pkgInfo) => {
                    pkgInfo.cfg.dependencies = { ms: '0.7.0' };

                    writeFile('package.json', JSON.stringify(pkgInfo.cfg));
                })
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                validations: { vulnerableDependencies: false },
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
                        getTestOptions({ set: { prePublishScript: 'git' } })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        'Command `git` exited with code 1.'
                    )
                ));

        it('Should run prepublish script', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
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
                        getTestOptions({ set: { postPublishScript: 'git' } })
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) =>
                    assert.strictEqual(
                        err.message,
                        'Command `git` exited with code 1.'
                    )
                ));

        it('Should run postpublish script', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
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
                                prePublishScript: 'git',
                                postPublishScript: 'git mv README.md test-file',
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
                        'Command `git` exited with code 1.'
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
                            set: { publishCommand: 'gulp publish' },
                            remove: 'publishTag',
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        'gulp publish --tag latest --with-publish-please'
                    )
                ));

        it('Should execute a custom publish command with a custom tag', () =>
            exec('git checkout master')
                .then(() =>
                    publish(
                        getTestOptions({
                            set: {
                                publishCommand: 'gulp publish',
                                publishTag: 'alpha',
                            },
                        })
                    )
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        'gulp publish --tag alpha --with-publish-please'
                    )
                ));
    });

    describe('Publish tag', () => {
        it('Should publish with the given tag', () =>
            exec('git checkout master')
                .then(() =>
                    publish(getTestOptions({ set: { publishTag: 'alpha' } }))
                )
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        'npm publish --tag alpha --with-publish-please'
                    )
                ));

        it('Should publish with the `latest` tag by default', () =>
            exec('git checkout master')
                .then(() => publish(getTestOptions({ remove: 'publishTag' })))
                .then((npmCmd) =>
                    assert.strictEqual(
                        npmCmd,
                        'npm publish --tag latest --with-publish-please'
                    )
                ));
    });

    describe('Guard', () => {
        const GUARD_ERROR = 'node ../lib/guard.js';

        beforeEach(() => {
            const pkg = JSON.parse(readFile('package.json').toString());

            pkg.scripts = { prepublishOnly: 'node ../lib/guard.js' };

            writeFile('package.json', JSON.stringify(pkg));
        });

        it('Should prevent publishing without special flag', () =>
            exec('npm publish')
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    assert(err.message.indexOf(GUARD_ERROR) >= 0);
                }));

        it('Should allow publishing with special flag', () =>
            exec('npm publish --with-publish-please')
                // NOTE: it will reject anyway because this package version already
                // published or test host don't have permissions to do that
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    console.log(err.message);
                    // prettier-ignore
                    assert(
                        err.message.indexOf('You do not have permission to publish') > -1
                        || err.message.indexOf('auth required for publishing') > -1
                    );
                }));

        it('Should not fail on `install`', () => exec('npm install'));
    });

    describe('Init', () => {
        // TODO: replace cp by a cross-platform solution
        beforeEach(() => {
            return mkdir(
                'node_modules/publish-please/lib'.replace(/\\|\//g, sep)
            ).then(() =>
                exec('cp -r ../lib/* node_modules/publish-please/lib')
            );
        });

        it('Should add hooks to package.json', () =>
            exec(
                'node node_modules/publish-please/lib/post-install.js --test-mode'
            ).then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(
                    cfg.scripts['publish-please'],
                    'publish-please'
                );
                assert.strictEqual(
                    cfg.scripts['prepublishOnly'],
                    'publish-please guard'
                );
            }));

        it('Should add guard gracefully', () => {
            writeFile(
                'package.json',
                JSON.stringify({
                    scripts: {
                        prepublishOnly: 'yo',
                    },
                })
            );

            return exec(
                'node node_modules/publish-please/lib/post-install.js --test-mode'
            ).then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(
                    cfg.scripts['prepublishOnly'],
                    'publish-please guard && yo'
                );
            });
        });

        it("Should not modify config if it's already modified", () =>
            exec(
                'node node_modules/publish-please/lib/post-install.js --test-mode'
            ).then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(
                    cfg.scripts['publish-please'],
                    'publish-please'
                );
                assert.strictEqual(
                    cfg.scripts['prepublishOnly'],
                    'publish-please guard'
                );
            }));

        it("Should exit with error if package.json doesn't exists", () =>
            del('package.json')
                .then(() =>
                    exec(
                        'node node_modules/publish-please/lib/post-install.js --test-mode'
                    )
                )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    assert.strictEqual(err.code, 1);
                }));
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
                        publish(getTestOptions({ set: { confirm: true } }))
                    )
                    .then((npmCmd) => {
                        assert.ok(confirmCalled);
                        assert.strictEqual(
                            npmCmd,
                            'npm publish --tag null --with-publish-please'
                        );
                    }));
        });

        describe('Failed', () => {
            before(() => (mockConfirm = () => Promise.resolve(false)));

            after(() => (mockConfirm = () => {}));

            it('Should return empty string if publish was not confirmed', () =>
                exec('git checkout master')
                    .then(() =>
                        publish(getTestOptions({ set: { confirm: true } }))
                    )
                    .then((npmCmd) => assert.strictEqual(npmCmd, '')));

            it('Should not run postpublish script if publishing was not confirmed', () =>
                exec('git checkout master')
                    .then(() =>
                        publish(
                            getTestOptions({
                                set: {
                                    confirm: true,
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
        before(() => {
            // do nothing
        });

        it(`Should not install ${packageName} globally`, () => {
            return exec(
                `npm install -g ../${packageName.replace('@', '-')}.tgz`
            )
                .then(() => {
                    throw new Error('Promise rejection expected');
                })
                .catch((err) => {
                    assert(err.message.indexOf('node lib/pre-install.js') > -1);
                });
        });
    });
});
