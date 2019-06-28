'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const assert = require('assert');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const readFile = require('fs').readFileSync;
const exec = require('cp-sugar').exec;
const packageName = require('./utils/publish-please-version-under-test');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const EOL = require('os').EOL;
const lineSeparator = '----------------------------------';

/* eslint-disable max-nested-callbacks */
describe('npx integration tests with npm audit', () => {
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

    if (nodeInfos.npmAuditHasJsonReporter) {
        it('Should handle missing .auditignore and audit.opts files when vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
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
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    pkg.dependencies = {
                        'publish-please': '2.4.1',
                    };
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish08.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish08.log').toString();
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
                    assert(publishLog.includes('publish-please -> ban-sensitive-files -> ggit -> lodash'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> https-proxy-agent'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> joi -> hoek'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> joi -> moment'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> joi -> topo -> hoek'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> rc -> deep-extend'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> wreck -> boom -> hoek'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> wreck -> hoek'));
                });
        });

        it('Should handle .auditignore and audit.opts files when vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
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
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    pkg.dependencies = {
                        'publish-please': '2.4.1',
                    };
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    // will remove low vulnerabilities
                    const auditOptions = `
                        --audit-level=moderate
                        `;
                    writeFile('audit.opts', auditOptions);
                })
                .then(() => {
                    // will remove moderate vulnerabilities with advisories 566
                    const auditIgnore = ['https://npmjs.com/advisories/566'];
                    writeFile('.auditignore', auditIgnore.join(EOL));
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish09.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish09.log').toString();
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
                    assert(publishLog.includes('publish-please -> ban-sensitive-files -> ggit -> lodash'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> https-proxy-agent'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> moment'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> topo -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> rc -> deep-extend'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> boom -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> hoek'));
                });
        });

        it('Should publish when --audit-level is set to critical and vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
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
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    pkg.dependencies = {
                        'publish-please': '2.4.1',
                    };
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    // will remove low+moderate+high vulnerabilities
                    const auditOptions = `
                        --audit-level=critical 
                        `;
                    writeFile('audit.opts', auditOptions);
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish10.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish10.log').toString();
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
                    assert(!publishLog.includes('publish-please -> ban-sensitive-files -> ggit -> lodash'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> https-proxy-agent'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> moment'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> topo -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> rc -> deep-extend'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> boom -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> hoek'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(publishLog.includes('Command `npm` exited with code'));
                });
        });

        it('Should not publish when --audit-level is set to high and vulnerability check is enabled in .publishrc config file', () => {
            return Promise.resolve()
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
                .then(() => {
                    const pkg = JSON.parse(readFile('package.json').toString());
                    pkg.dependencies = {
                        'publish-please': '2.4.1',
                    };
                    writeFile('package.json', JSON.stringify(pkg, null, 2));
                })
                .then(() => {
                    // will remove low+moderate vulnerabilities
                    const auditOptions = `
                        --audit-level=high 
                        `;
                    writeFile('audit.opts', auditOptions);
                })
                .then(() => console.log(`> npx ${packageName}`))
                .then(() =>
                    exec(
                        /* prettier-ignore */
                        `npx ../${packageName.replace('@','-')}.tgz > ./publish10.log`
                    )
                )
                .then(() => {
                    const publishLog = readFile('./publish10.log').toString();
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
                    assert(publishLog.includes('publish-please -> ban-sensitive-files -> ggit -> lodash'));
                    /* prettier-ignore */
                    assert(publishLog.includes('publish-please -> nsp -> https-proxy-agent'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> moment'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> joi -> topo -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> rc -> deep-extend'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> boom -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('publish-please -> nsp -> wreck -> hoek'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Release info'));
                    /* prettier-ignore */
                    assert(!publishLog.includes('Command `npm` exited with code'));
                });
        });
    }
});
