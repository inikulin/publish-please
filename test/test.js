'use strict';

const assert     = require('assert');
const del        = require('del');
const writeFile  = require('fs').writeFileSync;
const readFile   = require('fs').readFileSync;
const sep        = require('path').sep;
const defaults   = require('lodash/defaultsDeep');
const unset      = require('lodash/unset');
const exec       = require('cp-sugar').exec;
const pkgd       = require('pkgd');
const mkdirp     = require('mkdirp');
const Promise    = require('pinkie-promise');
const publish    = require('../lib/publish');
const getOptions = require('../lib/publish').getOptions;

function mkdir (path) {
    return new Promise((resolve, reject) => mkdirp(path, null, err => err ? reject(err) : resolve()));
}

function getTestOptions (settings) {
    const disabled = {
        validations: {
            sensitiveData:          false,
            uncommittedChanges:     false,
            untrackedFiles:         false,
            gitTag:                 false,
            branch:                 false,
            vulnerableDependencies: false
        },

        confirm:          false,
        publishTag:       null,
        prePublishScript: null
    };

    if (settings && settings.remove)
        unset(disabled, settings.remove);


    return defaults({}, settings && settings.set, disabled);
}

function colorGitOutput () {
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
        'git config color.status.untracked blue'
    ];

    return gitColorCommands.reduce((p, c) => p.then(() => exec(c)), Promise.resolve());
}

before(() => {
    require('../lib/publish').testMode     = true;
    require('../lib/validations').testMode = true;

    return del('testing-repo')
        .then(() => exec('git clone https://github.com/inikulin/testing-repo.git testing-repo'))
        .then(() => process.chdir('testing-repo'));
});

after(() => {
    process.chdir('../');
    return exec('sed -i\'\' \'/= blue/d\' .git/config')
        .then(() => del('testing-repo'));
});

beforeEach(() => colorGitOutput());

afterEach(() => exec('git reset --hard HEAD').then(exec('git clean -f -d')));

describe('package.json', () => {
    it('Should validate package.json existence', () =>
        exec('git checkout no-package-json')
            .then(() => publish(getTestOptions()))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, "package.json file doesn't exist.")));
});


describe('.publishrc', () => {
    it('Should use options from .publishrc file', () => {
        writeFile('.publishrc', JSON.stringify({
            confirm:     false,
            validations: {
                sensitiveData:      false,
                uncommittedChanges: true,
                untrackedFiles:     true
            }
        }));

        const opts = getOptions({
            validations: {
                uncommittedChanges: false,
                sensitiveData:      false,
                untrackedFiles:     false
            }
        });

        assert(!opts.confirm);
        assert.strictEqual(opts.prePublishScript, 'npm test');
        assert.strictEqual(opts.publishTag, 'latest');
        assert.strictEqual(opts.validations.branch, 'master');
        assert(!opts.validations.uncommittedChanges);
        assert(!opts.validations.untrackedFiles);
    });

    it('Should expect .publishrc to be a valid JSON file', () => {
        writeFile('.publishrc', 'yoyo123');

        try {
            getOptions();
        }
        catch (err) {
            assert.strictEqual(err.message, '.publishrc is not a valid JSON file.');
        }
    });
});

describe('Branch validation', () => {
    it('Should expect `master` branch by default', () =>
        exec('git checkout some-branch')
            .then(() => publish(getTestOptions({ remove: 'validations.branch' })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, '  * Expected branch to be `master`, but it was `some-branch`.')));


    it('Should validate branch passed via parameter', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validations: { branch: 'no-package-json' } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, '  * Expected branch to be `no-package-json`, but it was `master`.')));

    it('Should expect the latest commit in the branch', () =>
        exec('git checkout 15a1ef78338cf1fa60c318828970b2b3e70004d1')
            .then(() => publish(getTestOptions({ set: { validations: { branch: 'master' } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                const msgRe = /^ {2}\* Expected branch to be `master`, but it was `\((?:HEAD )?detached (?:from|at) 15a1ef7\)`.$/;

                assert(msgRe.test(err.message));
            }));

    it('Should pass validation', () =>
        exec('git checkout some-branch')
            .then(() => publish(getTestOptions({ set: { validations: { branch: 'some-branch' } } }))));

    it('Should not validate if option is disabled', () =>
        exec('git checkout some-branch')
            .then(() => publish(getTestOptions())));
});

describe('Git tag validation', () => {
    afterEach(() => exec('git tag | xargs git tag -d'));

    it('Should expect git tag to match version', () =>
        exec('git checkout master')
            .then(() => exec('git tag v0.0.42'))
            .then(() => publish(getTestOptions({ set: { validations: { gitTag: true } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, '  * Expected git tag to be `1.3.77` or `v1.3.77`, but it was `v0.0.42`.')));

    it('Should expect git tag to exist', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validations: { gitTag: true } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, "  * Latest commit doesn't have git tag.")));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => exec('git tag v1.3.77'))
            .then(() => publish(getTestOptions({ set: { validations: { gitTag: true } } }))));

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

                return publish(getTestOptions({ set: { validations: { uncommittedChanges: true } } }));
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, '  * There are uncommitted changes in the working tree.')));

    it('Should pass validation if option is disabled', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('README.md', 'Yo!');

                return publish(getTestOptions());
            }));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validations: { uncommittedChanges: true } } }))));
});

describe('Untracked files check', () => {
    it('Should expect no untracked files in the working tree', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish(getTestOptions({ set: { validations: { untrackedFiles: true } } }));
            })
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, '  * There are untracked files in the working tree.')));

    it('Should pass validation if option is disabled', () =>
        exec('git checkout master')
            .then(() => {
                writeFile('test-file', 'Yo!');

                return publish(getTestOptions());
            }));

    it('Should pass validation', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { validations: { untrackedFiles: true } } }))));
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
            .then(() => publish(getTestOptions({ set: { validations: { sensitiveData: true } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert.strictEqual(err.message, '  * Sensitive data found in the working tree:\n' +
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
            .then(() => publish(getTestOptions({
                set: {
                    validations: {
                        sensitiveData: {
                            ignore: ['lib/schema.rb', 'lib/*.keychain']
                        }
                    }
                }
            }))));

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
            .then(pkgInfo => {
                pkgInfo.cfg.dependencies = { 'ms': '0.7.0' };

                writeFile('package.json', JSON.stringify(pkgInfo.cfg));
            })
            .then(() => publish(getTestOptions({ set: { validations: { vulnerableDependencies: true } } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err.message.indexOf('1 vulnerabilities found') > -1);
                assert(err.message.indexOf('ms@0.7.0') > -1);
            }));

    it('Should not perform check if option is disabled', () =>
        exec('git checkout master')
            .then(() => pkgd())
            .then(pkgInfo => {
                pkgInfo.cfg.dependencies = { 'ms': '0.7.0' };

                writeFile('package.json', JSON.stringify(pkgInfo.cfg));
            })
            .then(() => publish(getTestOptions({ set: { validations: { vulnerableDependencies: false } } }))));
});

describe('Prepublish script', () => {
    it('Should fail if prepublish script fail', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { prePublishScript: 'git' } })))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => assert.strictEqual(err.message, 'Command `git` exited with code 1.')));

    it('Should run prepublish script', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { prePublishScript: 'git mv README.md test-file' } })))
            .then(() => assert(readFile('test-file'))));
});

describe('Publish tag', () => {
    it('Should publish with the given tag', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ set: { publishTag: 'alpha' } })))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag alpha --with-publish-please')));

    it('Should publish with the `latest` tag by default', () =>
        exec('git checkout master')
            .then(() => publish(getTestOptions({ remove: 'publishTag' })))
            .then(npmCmd => assert.strictEqual(npmCmd, 'npm publish --tag latest --with-publish-please')));
});

describe('Guard', () => {
    const GUARD_ERROR = 'node ../lib/guard.js';

    beforeEach(() => {
        const pkg = JSON.parse(readFile('package.json').toString());

        pkg.scripts = { prepublish: 'node ../lib/guard.js' };

        writeFile('package.json', JSON.stringify(pkg));
    });

    it('Should prevent publishing without special flag', () =>
        exec('npm publish')
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err.message.indexOf(GUARD_ERROR) >= 0);
            })
    );

    it('Should allow publishing with special flag', () =>
        exec('npm publish --with-publish-please')
        // NOTE: it will reject anyway because this package version already
        // published or test host don't have permissions to do that
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert(err.message.indexOf(GUARD_ERROR) < 0);
            })
    );

    it('Should not fail on `install`', () => exec('npm install'));
});

describe('Init', () => {
    beforeEach(() => {
        return mkdir('node_modules/publish-please/lib'.replace(/\\|\//g, sep))
            .then(() => exec('cp -r ../lib/* node_modules/publish-please/lib'));
    });

    it('Should add hooks to package.json', () =>
        exec('node node_modules/publish-please/lib/init.js --test-mode')
            .then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(cfg.scripts['publish-please'], 'publish-please');
                assert.strictEqual(cfg.scripts['prepublish'], 'publish-please guard');
            })
    );

    it('Should add guard gracefully', () => {
        writeFile('package.json', JSON.stringify({
            scripts: {
                prepublish: 'yo'
            }
        }));

        return exec('node node_modules/publish-please/lib/init.js --test-mode')
            .then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(cfg.scripts['prepublish'], 'publish-please guard && yo');
            });

    });

    it("Should not modify config if it's already modified", () =>
        exec('node node_modules/publish-please/lib/init.js --test-mode')
            .then(() => exec('node node_modules/publish-please/lib/init.js --test-mode'))
            .then(() => {
                const cfg = JSON.parse(readFile('package.json').toString());

                assert.strictEqual(cfg.scripts['publish-please'], 'publish-please');
                assert.strictEqual(cfg.scripts['prepublish'], 'publish-please guard');
            })
    );

    it("Should exit with error if package.json doesn't exists", () =>
        del('package.json')
            .then(() => exec('node node_modules/publish-please/lib/init.js --test-mode'))
            .then(() => {
                throw new Error('Promise rejection expected');
            })
            .catch(err => {
                assert.strictEqual(err.code, 1);
            })
    );

});
