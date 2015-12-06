var assert      = require('assert');
var PluginError = require('gulp-util').PluginError;
var del         = require('del');
var publish     = require('../lib');
var git         = require('../lib').git;

before(function () {
    publish.testMode = true;

    return git('clone https://github.com/inikulin/publish-please-test-repo.git').then(function () {
        process.chdir('publish-please-test-repo');
    });
});

after(function (done) {
    process.chdir('../');
    del('publish-please-test-repo', done);
});

it('Should validate package.json existence', function () {
    return git('checkout no-package-json')
        .then(function () {
            return publish({
                confirm:        false,
                validateGitTag: false,
                validateBranch: false
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

describe('Branch validation', function () {
    it('Should expect `master` branch by default', function () {
        return git('checkout no-tag')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false
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
        return git('checkout master')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: 'no-tag'
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
        return git('checkout a4b76ae5d285800eadcf16e60c75edc33071d929')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: 'master'
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
        return git('checkout no-tag')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: 'no-tag'
                });
            });
    });

    it('Should not validate if option is disabled', function () {
        return git('checkout no-tag')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: false
                });
            });
    });
});

describe('Git tag validation', function () {
    it('Should expect git tag to match version', function () {
        return git('checkout tag-doesnt-match-version')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: true,
                    validateBranch: false
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
        return git('checkout no-tag')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: true,
                    validateBranch: false
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
        return git('checkout master')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: true,
                    validateBranch: false
                });
            });
    });

    it('Should not validate if option is disabled', function () {
        return git('checkout tag-doesnt-match-version')
            .then(function () {
                return publish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: false
                });
            });
    });
});
