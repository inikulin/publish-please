var assert      = require('assert');
var PluginError = require('gulp-util').PluginError;
var del         = require('del');
var writeFile   = require('fs').writeFileSync;
var readFile    = require('fs').readFileSync;
var publish     = require('../lib');
var cmd         = require('../lib').cmd;
var getOptions  = require('../lib').getOptions;

before(function () {
    publish.testMode = true;

    return cmd('git clone https://github.com/inikulin/publish-please-test-repo.git').then(function () {
        process.chdir('publish-please-test-repo');
    });
});

after(function (done) {
    process.chdir('../');
    del('publish-please-test-repo', done);
});

describe('package.json', function () {
    it('Should validate package.json existence', function () {
        return cmd('git checkout no-package-json')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
            });
    });
});


describe('.publishrc', function () {
    afterEach(function () {
        return del('.publishrc');
    });

    it('Should use options from .publishrc file', function () {
        writeFile('.publishrc', JSON.stringify({
            confirm:          false,
            prepublishScript: 'npm test',
            checkUncommitted: true,
            checkUntracked:   true
        }));

        var opts = getOptions({
            checkUncommitted: false,
            checkUntracked:   false
        });

        assert(!opts.confirm);
        assert.strictEqual(opts.prepublishScript, 'npm test');
        assert(!opts.checkUncommitted);
        assert(!opts.checkUntracked);
        assert.strictEqual(opts.validateBranch, 'master');
    });

    it('Should expect .publishrc to be a valid JSON file', function () {
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

describe('Branch validation', function () {
    it('Should expect `master` branch by default', function () {
        return cmd('git checkout no-tag')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `master`, but it was `no-tag`.');
            });
    });

    it('Should validate branch passed via parameter', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   'no-tag'
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `no-tag`, but it was `master`.');
            });
    });

    it('Should expect the latest commit in the branch', function () {
        return cmd('git checkout a4b76ae5d285800eadcf16e60c75edc33071d929')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   'master'
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `master`, but it was `(detached from a4b76ae)`.');
            });
    });

    it('Should pass validation', function () {
        return cmd('git checkout no-tag')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   'no-tag'
                });
            });
    });

    it('Should not validate if option is disabled', function () {
        return cmd('git checkout no-tag')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });
});

describe('Git tag validation', function () {
    it('Should expect git tag to match version', function () {
        return cmd('git checkout tag-doesnt-match-version')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   true,
                    validateBranch:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected git tag to be `1.0.0` or `v1.0.0`, but it was `v0.0.42`.');
            });
    });

    it('Should expect git tag to exist', function () {
        return cmd('git checkout no-tag')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   true,
                    validateBranch:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "  * Latest commit doesn't have git tag.");
            });
    });

    it('Should pass validation', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   true,
                    validateBranch:   false
                });
            });
    });

    it('Should not validate if option is disabled', function () {
        return cmd('git checkout tag-doesnt-match-version')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });
});

describe('Uncommitted changes check', function () {
    afterEach(function () {
        return cmd('git reset --hard HEAD');
    });

    it('Should expect no uncommitted changes in the working tree', function () {
        return cmd('git checkout master')
            .then(function () {
                writeFile('README.md', 'Yo!');

                return publish({
                    confirm:          false,
                    checkUncommitted: true,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "  * There are uncommitted changes in the working tree.");
            });
    });

    it('Should pass validation if option is disabled', function () {
        return cmd('git checkout master')
            .then(function () {
                writeFile('README.md', 'Yo!');

                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });

    it('Should pass validation', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: true,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });
});

describe('Untracked files check', function () {
    afterEach(function () {
        return del('test-file');
    });

    it('Should expect no untracked files in the working tree', function () {
        return cmd('git checkout master')
            .then(function () {
                writeFile('test-file', 'Yo!');

                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   true,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "  * There are untracked files in the working tree.");
            });
    });

    it('Should pass validation if option is disabled', function () {
        return cmd('git checkout master')
            .then(function () {
                writeFile('test-file', 'Yo!');

                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   false,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });

    it('Should pass validation', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    checkUncommitted: false,
                    checkUntracked:   true,
                    validateGitTag:   false,
                    validateBranch:   false
                });
            });
    });
});

describe('Prepublish script', function () {
    afterEach(function () {
        return cmd('git reset --hard HEAD');
    });

    it('Should fail if prepublish script fail', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    prepublishScript: 'git'
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, 'Prepublish script `git` exited with code 1.');
            });
    });

    it('Should run prepublish script', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm:          false,
                    prepublishScript: 'git mv README.md test-file'
                });
            })
            .then(function () {
                assert(readFile('test-file'));
            });
    });
});

describe('Publish tag', function () {
    it('Should publish with the given tag', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm: false,
                    tag:     'alpha'
                });
            })
            .then(function (npmCmd) {
                assert.strictEqual(npmCmd, 'npm publish --tag alpha');
            });
    });

    it('Should publish with the `latest` tag by default', function () {
        return cmd('git checkout master')
            .then(function () {
                return publish({
                    confirm: false
                });
            })
            .then(function (npmCmd) {
                assert.strictEqual(npmCmd, 'npm publish --tag latest');
            });
    });
});
