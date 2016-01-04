'use strict';

const assert      = require('assert');
const PluginError = require('gulp-util').PluginError;
const del         = require('del');
const writeFile   = require('fs').writeFileSync;
const readFile    = require('fs').readFileSync;
const mkdir       = require('mkdir-promise');
const defaults    = require('defaults');
const publish     = require('../lib');
const exec        = require('../lib/cp').exec;
const getOptions  = require('../lib').getOptions;


function getTestOptions (settings) {
    const disabled = {
        confirm:            false,
        sensitiveDataAudit: false,
        checkUncommitted:   false,
        checkUntracked:     false,
        validateGitTag:     false,
        validateBranch:     false,
        tag:                null,
        prepublishScript:   null
    };

    if (settings && settings.remove)
        delete disabled[settings.remove];


    return defaults(settings && settings.set, disabled);
}

before(() => {
    publish.testMode = true;

    return exec('git clone https://github.com/inikulin/publish-please-test-repo.git')
        .then(() => process.chdir('publish-please-test-repo'));
});

after(() => {
    process.chdir('../');
    return del('publish-please-test-repo');
});

describe('package.json', () => {
    it('Should validate package.json existence', () =>
        exec('git checkout no-package-json')
            .then(() => publish(getTestOptions()))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
            }));
});


describe('.publishrc', () => {
    afterEach(() => del('.publishrc'));

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
    it('Should expect `master` branch by default', () =>
        exec('git checkout no-tag')
            .then(() => publish(getTestOptions({ remove: 'validateBranch' })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `master`, but it was `no-tag`.');
            }));


    it('Should validate branch passed via parameter', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validateBranch: 'no-tag' } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected branch to be `no-tag`, but it was `master`.');
            }));

    it('Should expect the latest commit in the branch', () =>
        exec('git checkout a4b76ae5d285800eadcf16e60c75edc33071d929')
            .then(() => publish(getTestOptions({ set: { validateBranch: 'master' } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                const msgRe = /^ {2}\* Expected branch to be `master`, but it was `\((?:HEAD )?detached (?:from|at) a4b76ae\)`.$/;

                assert(err instanceof PluginError);
                assert(msgRe.test(err.message));
            }));

    it('Should pass validation', () =>
        exec('git checkout no-tag')
            .then(() => publish(getTestOptions({ set: { validateBranch: 'no-tag' } }))));

    it('Should not validate if option is disabled', () =>
        exec('git checkout no-tag')
            .then(() => publish(getTestOptions())));
});

describe('Git tag validation', () => {
    it('Should expect git tag to match version', () =>
        exec('git checkout tag-doesnt-match-version')
            .then(() => publish(getTestOptions({ set: { validateGitTag: true } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * Expected git tag to be `1.0.0` or `v1.0.0`, but it was `v0.0.42`.');
            }));

    it('Should expect git tag to exist', () =>
        exec('git checkout no-tag')
            .then(() => publish(getTestOptions({ set: { validateGitTag: true } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, "  * Latest commit doesn't have git tag.");
            }));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validateGitTag: true } }))));

    it('Should not validate if option is disabled', () =>
        exec('git checkout tag-doesnt-match-version')
            .then(() => publish(getTestOptions())));
});

describe('Uncommitted changes check', () => {
    afterEach(() => exec('git reset --hard HEAD'));

    it('Should expect no uncommitted changes in the working tree', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('README.md', 'Yo!');

                return publish(getTestOptions({ set: { checkUncommitted: true } }));
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * There are uncommitted changes in the working tree.');
            }));

    it('Should pass validation if option is disabled', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('README.md', 'Yo!');

                return publish(getTestOptions());
            }));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { checkUncommitted: true } }))));
});

describe('Untracked files check', () => {
    afterEach(() => del('test-file'));

    it('Should expect no untracked files in the working tree', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish(getTestOptions({ set: { checkUntracked: true } }));
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, '  * There are untracked files in the working tree.');
            }));

    it('Should pass validation if option is disabled', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish(getTestOptions());
            }));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { checkUntracked: true } }))));
});

describe('Sensitive information audit', () => {
    afterEach(() => Promise.all([
        del('schema.rb'),
        del('test/database.yml')
    ]));

    it('Should fail if finds sensitive information', () =>
        exec('git checkout master')
            .then(() => mkdir('test'))
            .then(() => {
                writeFile('schema.rb', 'test');
                writeFile('test/database.yml', 'test');
            })
            .then(() => publish(getTestOptions({ set: { sensitiveDataAudit: true } })))
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
            }));

    it('Should not perform check if option is disabled', () =>
        exec('git checkout master')
            .then(() => mkdir('test'))
            .then(() => {
                writeFile('schema.rb', 'test');
                writeFile('test/database.yml', 'test');
            })
            .then(() => publish(getTestOptions())));
});

describe('Prepublish script', () => {
    afterEach(() => exec('git reset --hard HEAD'));

    it('Should fail if prepublish script fail', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { prepublishScript: 'git' } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err instanceof PluginError);
                assert.strictEqual(err.message, 'Command `git` exited with code 1.');
            }));

    it('Should run prepublish script', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { prepublishScript: 'git mv README.md test-file' } })))
            .then(() => assert(readFile('test-file'))));
});

describe('Publish tag', () => {
    it('Should publish with the given tag', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { tag: 'alpha' } })))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag alpha')));

    it('Should publish with the `latest` tag by default', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ remove: 'tag' })))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag latest')));
});
