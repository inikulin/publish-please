var assert      = require('assert');
var PluginError = require('gulp-util').PluginError;
var del         = require('del');
var npmPublish  = require('../');
var git         = require('../').git;

before(function () {
    npmPublish.testMode = true;

    return git('clone https://github.com/inikulin/gnp-test-repo.git').then(function () {
        process.chdir('gnp-test-repo');
    });
});

describe('Branch validation', function () {
    it('Should expect `master` branch by default', function () {
        return git('checkout no-tag')
            .then(function () {
                return npmPublish({
                    confirm:        false,
                    validateGitTag: false
                });
            })
            .then(function () {
                throw new Error('Promise rejection expected');
            })
            .catch(function (err) {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, 'Expected branch to be `master`, but it was `no-tag`.');
            });
    });

    it('Should validate branch passed via parameter', function () {
        return git('checkout master')
            .then(function () {
                return npmPublish({
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
                assert.strictEqual(err.message, 'Expected branch to be `no-tag`, but it was `master`.');
            });
    });

    it('Should pass validation', function () {
        return git('checkout no-tag')
            .then(function () {
                return npmPublish({
                    confirm:        false,
                    validateGitTag: false,
                    validateBranch: 'no-tag'
                });
            });
    });
});

after(function (done) {
    process.chdir('../');
    del('gnp-test-repo', done);
});
