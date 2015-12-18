const assert      = require('assert');
const PluginError = require('gulp-util').PluginError;
const del         = require('del');
const writeFile   = require('fs').writeFileSync;
const readFile    = require('fs').readFileSync;
const mkdir       = require('mkdir-promise');
const publish     = require('../lib');
const cmd         = require('../lib').cmd;
const getOptions  = require('../lib').getOptions;

before(() => {
    publish.testMode = true;

    return cmd('git clone https://github.com/inikulin/publish-please-test-repo.git')
        .then(() => process.chdir('publish-please-test-repo'));
});

after(done => {
    process.chdir('../');
    del('publish-please-test-repo', done);
});

describe('package.json', () => {
    it('Should validate package.json existence', () => {
        return cmd('git checkout no-package-json')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
            });
    });
});


describe('.publishrc', () => {
    afterEach(done => del('.publishrc', done));

    it('Should use options from .publishrc file', () => {
        writeFile('.publishrc', JSON.stringify({
            confirm:            false,
            sensitiveDataAudit: false,
            prepublishScript:   'npm test',
            checkUncommitted:   true,
            checkUntracked:     true
        }));

        const opts = getOptions({
            checkUncommitted:   false,
            sensitiveDataAudit: false,
            checkUntracked:     false
        });

        assert(!opts.confirm);
        assert.strictEqual(opts.prepublishScript, 'npm test');
        assert(!opts.checkUncommitted);
        assert(!opts.checkUntracked);
        assert.strictEqual(opts.validateBranch, 'master');
    });

    it('Should expect .publishrc to be a valid JSON file', () => {
        writeFile('.publishrc', 'yoyo123');

        try {
            getOptions();
        }
        catch (err) {
            assert(err instanceof PluginError);
            assert.strictEqual(err.message, '.publishrc is not a valid JSON file.');
        }
    });
});

describe('Branch validation', () => {
    it('Should expect `master` branch by default', () => {
        return cmd('git checkout no-tag')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `master`, but it was `no-tag`.');
            });
    });

    it('Should validate branch passed via parameter', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     'no-tag'
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `no-tag`, but it was `master`.');
            });
    });

    it('Should expect the latest commit in the branch', () => {
        return cmd('git checkout a4b76ae5d285800eadcf16e60c75edc33071d929')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     'master'
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                const msgRe = /^ {2}\* Expected branch to be `master`, but it was `\((?:HEAD )?detached (?:from|at) a4b76ae\)`.$/;

                assert(err instanceof PluginError);
                assert(msgRe.test(err.message));
            });
    });

    it('Should pass validation', () => {
        return cmd('git checkout no-tag')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     'no-tag'
            }));
    });

    it('Should not validate if option is disabled', () => {
        return cmd('git checkout no-tag')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }));
    });
});

describe('Git tag validation', () => {
    it('Should expect git tag to match version', () => {
        return cmd('git checkout tag-doesnt-match-version')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     true,
                validateBranch:     false
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected git tag to be `1.0.0` or `v1.0.0`, but it was `v0.0.42`.');
            });
    });

    it('Should expect git tag to exist', () => {
        return cmd('git checkout no-tag')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     true,
                validateBranch:     false
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "  * Latest commit doesn't have git tag.");
            });
    });

    it('Should pass validation', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     true,
                validateBranch:     false
            }));
    });

    it('Should not validate if option is disabled', () => {
        return cmd('git checkout tag-doesnt-match-version')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }));
    });
});

describe('Uncommitted changes check', () => {
    afterEach(() => cmd('git reset --hard HEAD'));

    it('Should expect no uncommitted changes in the working tree', () => {
        return cmd('git checkout master')
            .then(() => {
                writeFile('README.md', 'Yo!');

                return publish({
                    confirm:            false,
                    sensitiveDataAudit: false,
                    checkUncommitted:   true,
                    checkUntracked:     false,
                    validateGitTag:     false,
                    validateBranch:     false
                });
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * There are uncommitted changes in the working tree.');
            });
    });

    it('Should pass validation if option is disabled', () => {
        return cmd('git checkout master')
            .then(() => {
                writeFile('README.md', 'Yo!');

                return publish({
                    confirm:            false,
                    sensitiveDataAudit: false,
                    checkUncommitted:   false,
                    checkUntracked:     false,
                    validateGitTag:     false,
                    validateBranch:     false
                });
            });
    });

    it('Should pass validation', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   true,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }));
    });
});

describe('Untracked files check', () => {
    afterEach(done => del('test-file', done));

    it('Should expect no untracked files in the working tree', () => {
        return cmd('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish({
                    confirm:            false,
                    sensitiveDataAudit: false,
                    checkUncommitted:   false,
                    checkUntracked:     true,
                    validateGitTag:     false,
                    validateBranch:     false
                });
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * There are untracked files in the working tree.');
            });
    });

    it('Should pass validation if option is disabled', () => {
        return cmd('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish({
                    confirm:            false,
                    sensitiveDataAudit: false,
                    checkUncommitted:   false,
                    checkUntracked:     false,
                    validateGitTag:     false,
                    validateBranch:     false
                });
            });
    });

    it('Should pass validation', () => {
        return cmd('git checkout master')
            .then(() => {
                return publish({
                    confirm:            false,
                    sensitiveDataAudit: false,
                    checkUncommitted:   false,
                    checkUntracked:     true,
                    validateGitTag:     false,
                    validateBranch:     false
                });
            });
    });
});

describe('Sensitive information audit', () => {
    afterEach(done => del('schema.rb', () => del('test/database.yml', done)));

    it('Should fail if finds sensitive information', () => {
        return cmd('git checkout master')
            .then(() => mkdir('test'))
            .then(() => {
                writeFile('schema.rb', 'test');
                writeFile('test/database.yml', 'test');
            })
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: true,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Sensitive data found in the working tree:\n' +
                                                '    invalid filename schema.rb\n' +
                                                '     - Ruby On Rails database schema file\n' +
                                                '     - Contains information on the database schema of a Ruby On Rails application.\n' +
                                                '    invalid filename test/database.yml\n' +
                                                '     - Potential Ruby On Rails database configuration file\n' +
                                                '     - Might contain database credentials.'
                );
            });
    });

    it('Should not perform check if option is disabled', () => {
        return cmd('git checkout master')
            .then(() => mkdir('test'))
            .then(() => {
                writeFile('schema.rb', 'test');
                writeFile('test/database.yml', 'test');
            })
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                checkUncommitted:   false,
                checkUntracked:     false,
                validateGitTag:     false,
                validateBranch:     false
            }));
    });
});

describe('Prepublish script', () => {
    afterEach(() => cmd('git reset --hard HEAD'));

    it('Should fail if prepublish script fail', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                prepublishScript:   'git'
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, 'Command `git` exited with code 1.');
            });
    });

    it('Should run prepublish script', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                prepublishScript:   'git mv README.md test-file'
            }))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            // NOTE: will throw because we have uncommited changes
            .catch(() => assert(readFile('test-file')));
    });
});

describe('Publish tag', () => {
    it('Should publish with the given tag', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false,
                tag:                'alpha'
            }))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag alpha'));
    });

    it('Should publish with the `latest` tag by default', () => {
        return cmd('git checkout master')
            .then(() => publish({
                confirm:            false,
                sensitiveDataAudit: false
            }))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag latest'));
    });
});
