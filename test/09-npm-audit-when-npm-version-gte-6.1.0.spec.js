'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const mkdirp = require('mkdirp');
const pathJoin = require('path').join;
const del = require('del');
const audit = require('../lib/utils/npm-audit');
const nodeInfos = require('../lib/utils/get-node-infos').getNodeInfosSync();
const writeFile = require('fs').writeFileSync;
const existsSync = require('fs').existsSync;
const readDir = require('fs').readdirSync;
const EOL = require('os').EOL;
const exec = require('cp-sugar').exec;

const lineSeparator = '----------------------------------';

if (nodeInfos.npmAuditHasJsonReporter) {
    describe('npm audit analyzer when npm is >= 6.1.0', () => {
        let originalWorkingDirectory;
        let projectDir;

        before(() => {
            originalWorkingDirectory = process.cwd();
            projectDir = pathJoin(__dirname, 'tmp', 'audit02');
            mkdirp.sync(projectDir);
        });
        beforeEach(() => {
            console.log(`${lineSeparator} begin test ${lineSeparator}`);
            del.sync(pathJoin(projectDir, 'package.json'));
            del.sync(pathJoin(projectDir, 'package-lock.json'));
            del.sync(pathJoin(projectDir, '.auditignore'));
            del.sync(pathJoin(projectDir, 'audit.opts'));
        });
        afterEach(() => {
            process.chdir(originalWorkingDirectory);
            console.log(`${lineSeparator} end test ${lineSeparator}\n`);
        });

        it('Should report an error when package.json is badly formatted and there is no lock file', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: 'yo123',
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );

            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            error: {
                                code: 'EAUDITNOLOCK',
                                summary:
                                    'package.json file is missing or is badly formatted. Neither npm-shrinkwrap.json nor package-lock.json found: Cannot audit a project without a lockfile',
                                detail:
                                    'Try creating one first with: npm i --package-lock-only',
                            },
                        };
                        result.error.summary.should.containEql(
                            'package.json file is missing or is badly formatted'
                        );
                    })
            );
        });

        it('Should audit a project without a lockfile', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                scripts: {},
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [],
                            advisories: {},
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 0,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 0,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 0,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should remove auto-generated package-lock.json to prevent further validations to fail', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                scripts: {},
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const pakageLockFile = pathJoin(
                            projectDir,
                            'package-lock.json'
                        );
                        existsSync(pakageLockFile).should.be.false();
                    })
            );
        });

        it('Should create auto-generated log files in a temp folder to prevent further validations to fail', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {},
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const logFiles = readDir(projectDir).filter(
                            (filename) => filename.includes('.log')
                        );
                        logFiles.should.be.empty();
                    })
            );
        });

        it('Should audit a project that has no dependency', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                scripts: {},
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            const pkgLock = {
                name: 'testing-repo',
                lockfileVersion: 1,
            };
            writeFile(
                pathJoin(projectDir, 'package-lock.json'),
                JSON.stringify(pkgLock, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [],
                            advisories: {},
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 0,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 0,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 0,
                            },
                        };
                        result.should.containDeep(expected);
                        const pakageLockFile = pathJoin(
                            projectDir,
                            'package-lock.json'
                        );
                        existsSync(pakageLockFile).should.be.true();
                    })
            );
        });

        it('Should report vulnerability on ms@0.7.0 dependency ', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [
                                {
                                    action: 'install',
                                    module: 'ms',
                                    target: '2.1.2',
                                    isMajor: true,
                                    resolves: [
                                        {
                                            id: 46,
                                            path: 'ms',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                            ],
                            advisories: {
                                '46': {
                                    findings: [
                                        {
                                            version: '0.7.0',
                                            paths: ['ms'],
                                        },
                                    ],
                                    id: 46,
                                    created: '2015-10-24T16:06:54.122Z',
                                    updated: '2018-02-24T00:49:54.660Z',
                                    deleted: null,
                                    title:
                                        'Regular Expression Denial of Service',
                                    found_by: {
                                        name: 'Adam Baldwin',
                                    },
                                    reported_by: {
                                        name: 'Adam Baldwin',
                                    },
                                    module_name: 'ms',
                                    cves: ['CVE-2015-8315'],
                                    vulnerable_versions: '<=0.7.0',
                                    patched_versions: '>0.7.0',
                                    overview:
                                        'Versions of `ms` prior to 0.7.1 are affected by a regular expression denial of service vulnerability when extremely long version strings are parsed.\n\n## Proof of Concept\n```javascript\nvar ms = require(\'ms\');\nvar genstr = function (len, chr) {\n   var result = "";\n   for (i=0; i<=len; i++) {\n       result = result + chr;\n   }\n\n   return result;\n}\n\nms(genstr(process.argv[2], "5") + " minutea");\n\n```\n\n### Results\nShowing increase in execution time based on the input string.\n```\n$ time node ms.js 10000\n\nreal\t0m0.758s\nuser\t0m0.724s\nsys\t0m0.031s\n\n$ time node ms.js 20000\n\nreal\t0m2.580s\nuser\t0m2.494s\nsys\t0m0.047s\n\n$ time node ms.js 30000\n\nreal\t0m5.747s\nuser\t0m5.483s\nsys\t0m0.080s\n\n$ time node ms.js 80000\n\nreal\t0m41.022s\nuser\t0m38.894s\nsys\t0m0.529s\n```\n',
                                    recommendation:
                                        'Update to version 0.7.1 or later.\nAlternatively, apply a reasonable length limit to parsed version strings.',
                                    references: '',
                                    access: 'public',
                                    severity: 'moderate',
                                    cwe: 'CWE-400',
                                    metadata: {
                                        module_type: 'Multi.Library',
                                        exploitability: 2,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/46',
                                },
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 0,
                                    moderate: 1,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 1,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 1,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should report vulnerability on lodash < 4.17.5 as transitive dependency', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    'ban-sensitive-files': '1.9.2',
                    nsp: '3.2.1',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [
                                {
                                    action: 'update',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>inquirer>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>inquirer>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>inquirer>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                    depth: 3,
                                },
                                {
                                    action: 'review',
                                    module: 'lodash',
                                    resolves: [
                                        {
                                            id: 577,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 577,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'mem',
                                    resolves: [
                                        {
                                            id: 1084,
                                            path: 'nsp>yargs>os-locale>mem',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'minimist',
                                    resolves: [
                                        {
                                            id: 1179,
                                            path: 'ban-sensitive-files>ggit>optimist>minimist',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'yargs-parser',
                                    resolves: [
                                        {
                                            id: 1500,
                                            path: 'nsp>yargs>yargs-parser',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                            ],
                            advisories: {
                                '577': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 577,
                                    created: '2018-04-24T14:27:02.796Z',
                                    updated: '2018-04-24T14:27:13.049Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    reported_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-3721'],
                                    vulnerable_versions: '<4.17.5',
                                    patched_versions: '>=4.17.5',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `__proto__` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.5 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/310443)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/577',
                                },
                                '782': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 782,
                                    created: '2019-02-13T16:16:53.770Z',
                                    updated: '2019-06-27T14:01:44.172Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: { link: '', name: 'asgerf' },
                                    reported_by: { link: '', name: 'asgerf' },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-16487'],
                                    vulnerable_versions: '<4.17.11',
                                    patched_versions: '>=4.17.11',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.11 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/380873)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/782',
                                },
                                '1065': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 1065,
                                    created: '2019-07-15T17:22:56.990Z',
                                    updated: '2019-07-15T17:25:05.721Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2019-10744'],
                                    vulnerable_versions: '<4.17.12',
                                    patched_versions: '>=4.17.12',
                                    overview:
                                        'Versions of `lodash` before 4.17.12 are vulnerable to Prototype Pollution.  The function `defaultsDeep` allows a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n',
                                    recommendation:
                                        'Update to version 4.17.12 or later.',
                                    references:
                                        '- [Snyk Advisory](https://snyk.io/vuln/SNYK-JS-LODASH-450202)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1065',
                                },
                                '1084': {
                                    findings: [
                                        {
                                            version: '1.1.0',
                                            paths: [
                                                'nsp>yargs>os-locale>mem',
                                            ],
                                        },
                                    ],
                                    id: 1084,
                                    created: '2019-07-18T21:30:31.935Z',
                                    updated: '2019-11-19T23:31:37.349Z',
                                    deleted: null,
                                    title: 'Denial of Service',
                                    found_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    module_name: 'mem',
                                    cves: [],
                                    vulnerable_versions: '<4.0.0',
                                    patched_versions: '>=4.0.0',
                                    overview: "Versions of `mem` prior to 4.0.0 are vulnerable to Denial of Service (DoS).  The package fails to remove old values from the cache even after a value passes its `maxAge` property. This may allow attackers to exhaust the system's memory if they are able to abuse the application logging.",
                                    recommendation: 'Upgrade to version 4.0.0 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/npm:mem:20180117)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-400',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 2,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1084',
                                },
                                '1179': {
                                    findings: [
                                        {
                                            version: '0.0.10',
                                            paths: [
                                                'ban-sensitive-files>ggit>optimist>minimist',
                                            ],
                                        },
                                    ],
                                    id: 1179,
                                    created: '2019-09-23T15:01:43.049Z',
                                    updated: '2020-03-18T19:41:45.921Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    module_name: 'minimist',
                                    cves: [],
                                    vulnerable_versions: '<0.2.1 || >=1.0.0 <1.2.3',
                                    patched_versions: '>=0.2.1 <1.0.0 || >=1.2.3',
                                    overview: 'Affected versions of `minimist` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--__proto__.y=Polluted` adds a `y` property with value `Polluted` to all objects. The argument `--__proto__=Polluted` raises and uncaught error and crashes the application.  \nThis is exploitable if attackers have control over the arguments being passed to `minimist`.\n',
                                    recommendation: 'Upgrade to versions 0.2.1, 1.2.3 or later.',
                                    references: '- [GitHub commit 1](https://github.com/substack/minimist/commit/4cf1354839cb972e38496d35e12f806eea92c11f#diff-a1e0ee62c91705696ddb71aa30ad4f95)\n- [GitHub commit 2](https://github.com/substack/minimist/commit/63e7ed05aa4b1889ec2f3b196426db4500cbda94)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1179',
                                },
                                '1500': {
                                    findings: [
                                        {
                                            version: '7.0.0',
                                            paths: [
                                                'nsp>yargs>yargs-parser',
                                            ],
                                        },
                                    ],
                                    id: 1500,
                                    created: '2020-03-26T19:21:50.174Z',
                                    updated: '2020-05-01T01:05:15.020Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    module_name: 'yargs-parser',
                                    cves: [],
                                    vulnerable_versions: '<13.1.2 || >=14.0.0 <15.0.1 || >=16.0.0 <18.1.2',
                                    patched_versions: '>=13.1.2 <14.0.0 || >=15.0.1 <16.0.0 || >=18.1.2',
                                    overview: "Affected versions of `yargs-parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs-parser`.\n",
                                    recommendation: 'Upgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1500',
                                },
                                '1523': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: [
                                                'nsp>cli-table2>lodash',
                                            ],
                                        },
                                    ],
                                    id: 1523,
                                    created: '2020-05-20T01:36:49.357Z',
                                    updated: '2020-07-10T19:23:46.395Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    module_name: 'lodash',
                                    cves: [
                                        'CVE-2019-10744',
                                    ],
                                    vulnerable_versions: '<4.17.19',
                                    patched_versions: '>=4.17.19',
                                    overview: 'Versions of `lodash` prior to 4.17.19 are vulnerable to Prototype Pollution.  The function `zipObjectDeep` allows a malicious user to modify the prototype of `Object` if the property identifiers are user-supplied. Being affected by this issue requires zipping objects based on user-provided property arrays.  \n\nThis vulnerability causes the addition or modification of an existing property that will exist on all objects and may lead to Denial of Service or Code Execution under specific circumstances.',
                                    recommendation: 'Upgrade to version 4.17.19 or later.',
                                    references: '- [HackerOne Report](https://hackerone.com/reports/712065)\n- [GitHub Issue](https://github.com/lodash/lodash/issues/4744)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1523',
                                },
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 9,
                                    moderate: 0,
                                    high: 6,
                                    critical: 0,
                                },
                                dependencies: 197,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 197,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should report vulnerability on lodash@4.16.4 as direct dependency', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    lodash: '4.16.4',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [
                                {
                                    isMajor: false,
                                    action: 'install',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                },
                            ],
                            advisories: {
                                '577': {
                                    findings: [
                                        {
                                            version: '4.16.4',
                                            paths: ['lodash'],
                                        },
                                    ],
                                    id: 577,
                                    created: '2018-04-24T14:27:02.796Z',
                                    updated: '2018-04-24T14:27:13.049Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    reported_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-3721'],
                                    vulnerable_versions: '<4.17.5',
                                    patched_versions: '>=4.17.5',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `__proto__` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.5 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/310443)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/577',
                                },
                                '782': {
                                    findings: [
                                        {
                                            version: '4.16.4',
                                            paths: ['lodash'],
                                        },
                                    ],
                                    id: 782,
                                    created: '2019-02-13T16:16:53.770Z',
                                    updated: '2019-06-27T14:01:44.172Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: { link: '', name: 'asgerf' },
                                    reported_by: { link: '', name: 'asgerf' },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-16487'],
                                    vulnerable_versions: '<4.17.11',
                                    patched_versions: '>=4.17.11',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.11 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/380873)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/782',
                                },
                                '1065': {
                                    findings: [
                                        {
                                            version: '4.16.4',
                                            paths: ['lodash'],
                                        },
                                    ],
                                    id: 1065,
                                    created: '2019-07-15T17:22:56.990Z',
                                    updated: '2019-07-15T17:25:05.721Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2019-10744'],
                                    vulnerable_versions: '<4.17.12',
                                    patched_versions: '>=4.17.12',
                                    overview:
                                        'Versions of `lodash` before 4.17.12 are vulnerable to Prototype Pollution.  The function `defaultsDeep` allows a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n',
                                    recommendation:
                                        'Update to version 4.17.12 or later.',
                                    references:
                                        '- [Snyk Advisory](https://snyk.io/vuln/SNYK-JS-LODASH-450202)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1065',
                                },
                                '1523': {
                                    'findings': [
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                            ],
                                        },
                                    ],
                                    id: 1523,
                                    created: '2020-05-20T01:36:49.357Z',
                                    updated: '2020-07-10T19:23:46.395Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    module_name: 'lodash',
                                    cves: [
                                        'CVE-2019-10744',
                                    ],
                                    vulnerable_versions: '<4.17.19',
                                    patched_versions: '>=4.17.19',
                                    overview: 'Versions of `lodash` prior to 4.17.19 are vulnerable to Prototype Pollution.  The function `zipObjectDeep` allows a malicious user to modify the prototype of `Object` if the property identifiers are user-supplied. Being affected by this issue requires zipping objects based on user-provided property arrays.  \n\nThis vulnerability causes the addition or modification of an existing property that will exist on all objects and may lead to Denial of Service or Code Execution under specific circumstances.',
                                    recommendation: 'Upgrade to version 4.17.19 or later.',
                                    references: '- [HackerOne Report](https://hackerone.com/reports/712065)\n- [GitHub Issue](https://github.com/lodash/lodash/issues/4744)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1523',
                                },
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 2,
                                    moderate: 0,
                                    high: 2,
                                    critical: 0,
                                },
                                dependencies: 1,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 1,
                            },
                        };

                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should not report vulnerability stored in .auditignore file', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            const auditIgnore = ['https://npmjs.com/advisories/46'];
            writeFile(
                pathJoin(projectDir, '.auditignore'),
                auditIgnore.join(EOL)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [],
                            advisories: {},
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 0,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 1,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 1,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should report vulnerability that is not stored in .auditignore file', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0',
                    'ban-sensitive-files': '1.9.2',
                },
                devDependencies: {
                    lodash: '4.16.4',
                    nsp: '3.2.1',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            const auditIgnore = ['https://npmjs.com/advisories/46'];
            writeFile(
                pathJoin(projectDir, '.auditignore'),
                auditIgnore.join(EOL)
            );
            // When
            return (
                Promise.resolve()
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [
                                {
                                    isMajor: false,
                                    action: 'install',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                },
                                {
                                    action: 'update',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                    depth: 3,
                                },
                                {
                                    action: 'review',
                                    module: 'lodash',
                                    resolves: [
                                        {
                                            id: 577,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 577,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'mem',
                                    resolves: [
                                        {
                                            id: 1084,
                                            path: 'nsp>yargs>os-locale>mem',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'minimist',
                                    resolves: [
                                        {
                                            id: 1179,
                                            path: 'ban-sensitive-files>ggit>optimist>minimist',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'yargs-parser',
                                    resolves: [
                                        {
                                            id: 1500,
                                            path: 'nsp>yargs>yargs-parser',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                            ],
                            advisories: {
                                '577': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 577,
                                    created: '2018-04-24T14:27:02.796Z',
                                    updated: '2018-04-24T14:27:13.049Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    reported_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-3721'],
                                    vulnerable_versions: '<4.17.5',
                                    patched_versions: '>=4.17.5',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `__proto__` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.5 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/310443)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/577',
                                },
                                '782': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 782,
                                    created: '2019-02-13T16:16:53.770Z',
                                    updated: '2019-06-27T14:01:44.172Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: { link: '', name: 'asgerf' },
                                    reported_by: { link: '', name: 'asgerf' },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-16487'],
                                    vulnerable_versions: '<4.17.11',
                                    patched_versions: '>=4.17.11',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.11 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/380873)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/782',
                                },
                                '1065': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 1065,
                                    created: '2019-07-15T17:22:56.990Z',
                                    updated: '2019-07-15T17:25:05.721Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2019-10744'],
                                    vulnerable_versions: '<4.17.12',
                                    patched_versions: '>=4.17.12',
                                    overview:
                                        'Versions of `lodash` before 4.17.12 are vulnerable to Prototype Pollution.  The function `defaultsDeep` allows a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n',
                                    recommendation:
                                        'Update to version 4.17.12 or later.',
                                    references:
                                        '- [Snyk Advisory](https://snyk.io/vuln/SNYK-JS-LODASH-450202)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1065',
                                },
                                '1084': {
                                    findings: [
                                        {
                                            version: '1.1.0',
                                            paths: [
                                                'nsp>yargs>os-locale>mem',
                                            ],
                                        },
                                    ],
                                    id: 1084,
                                    created: '2019-07-18T21:30:31.935Z',
                                    updated: '2019-11-19T23:31:37.349Z',
                                    deleted: null,
                                    title: 'Denial of Service',
                                    found_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    module_name: 'mem',
                                    cves: [],
                                    vulnerable_versions: '<4.0.0',
                                    patched_versions: '>=4.0.0',
                                    overview: "Versions of `mem` prior to 4.0.0 are vulnerable to Denial of Service (DoS).  The package fails to remove old values from the cache even after a value passes its `maxAge` property. This may allow attackers to exhaust the system's memory if they are able to abuse the application logging.",
                                    recommendation: 'Upgrade to version 4.0.0 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/npm:mem:20180117)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-400',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 2,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1084',
                                },
                                '1179': {
                                    findings: [
                                        {
                                            version: '0.0.10',
                                            paths: [
                                                'ban-sensitive-files>ggit>optimist>minimist',
                                            ],
                                        },
                                    ],
                                    id: 1179,
                                    created: '2019-09-23T15:01:43.049Z',
                                    updated: '2020-03-18T19:41:45.921Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    module_name: 'minimist',
                                    cves: [],
                                    vulnerable_versions: '<0.2.1 || >=1.0.0 <1.2.3',
                                    patched_versions: '>=0.2.1 <1.0.0 || >=1.2.3',
                                    overview: 'Affected versions of `minimist` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--__proto__.y=Polluted` adds a `y` property with value `Polluted` to all objects. The argument `--__proto__=Polluted` raises and uncaught error and crashes the application.  \nThis is exploitable if attackers have control over the arguments being passed to `minimist`.\n',
                                    recommendation: 'Upgrade to versions 0.2.1, 1.2.3 or later.',
                                    references: '- [GitHub commit 1](https://github.com/substack/minimist/commit/4cf1354839cb972e38496d35e12f806eea92c11f#diff-a1e0ee62c91705696ddb71aa30ad4f95)\n- [GitHub commit 2](https://github.com/substack/minimist/commit/63e7ed05aa4b1889ec2f3b196426db4500cbda94)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1179',
                                },
                                '1500': {
                                    findings: [
                                        {
                                            version: '7.0.0',
                                            paths: [
                                                'nsp>yargs>yargs-parser',
                                            ],
                                        },
                                    ],
                                    id: 1500,
                                    created: '2020-03-26T19:21:50.174Z',
                                    updated: '2020-05-01T01:05:15.020Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    module_name: 'yargs-parser',
                                    cves: [],
                                    vulnerable_versions: '<13.1.2 || >=14.0.0 <15.0.1 || >=16.0.0 <18.1.2',
                                    patched_versions: '>=13.1.2 <14.0.0 || >=15.0.1 <16.0.0 || >=18.1.2',
                                    overview: "Affected versions of `yargs-parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs-parser`.\n",
                                    recommendation: 'Upgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1500',
                                },
                                '1523': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: [
                                                'nsp>cli-table2>lodash',
                                            ],
                                        },
                                    ],
                                    id: 1523,
                                    created: '2020-05-20T01:36:49.357Z',
                                    updated: '2020-07-10T19:23:46.395Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    module_name: 'lodash',
                                    cves: [
                                        'CVE-2019-10744',
                                    ],
                                    vulnerable_versions: '<4.17.19',
                                    patched_versions: '>=4.17.19',
                                    overview: 'Versions of `lodash` prior to 4.17.19 are vulnerable to Prototype Pollution.  The function `zipObjectDeep` allows a malicious user to modify the prototype of `Object` if the property identifiers are user-supplied. Being affected by this issue requires zipping objects based on user-provided property arrays.  \n\nThis vulnerability causes the addition or modification of an existing property that will exist on all objects and may lead to Denial of Service or Code Execution under specific circumstances.',
                                    recommendation: 'Upgrade to version 4.17.19 or later.',
                                    references: '- [HackerOne Report](https://hackerone.com/reports/712065)\n- [GitHub Issue](https://github.com/lodash/lodash/issues/4744)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1523',
                                },
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 11,
                                    moderate: 0,
                                    high: 8,
                                    critical: 0,
                                },
                                dependencies: 119,
                                devDependencies: 80,
                                optionalDependencies: 0,
                                totalDependencies: 199,
                            },
                        };

                        result.should.containDeep(expected);
                    })
            );
        });

        it('Should report vulnerability that is not stored in .auditignore file (package-lock.json exists)', () => {
            // Given
            const pkg = {
                name: 'testing-repo',
                dependencies: {
                    ms: '0.7.0',
                    'ban-sensitive-files': '1.9.2',
                },
                devDependencies: {
                    lodash: '4.16.4',
                    nsp: '3.2.1',
                },
            };
            writeFile(
                pathJoin(projectDir, 'package.json'),
                JSON.stringify(pkg, null, 2)
            );
            const auditIgnore = ['https://npmjs.com/advisories/46'];
            writeFile(
                pathJoin(projectDir, '.auditignore'),
                auditIgnore.join(EOL)
            );
            return (
                Promise.resolve()
                    .then(() => process.chdir(projectDir))
                    .then(() => exec('npm i --package-lock-only'))

                    // When
                    .then(() => audit(projectDir))

                    // Then
                    .then((result) => {
                        const expected = {
                            actions: [
                                {
                                    isMajor: false,
                                    action: 'install',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                },
                                {
                                    action: 'update',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                    module: 'lodash',
                                    target: '4.17.20',
                                    depth: 3,
                                },
                                {
                                    action: 'review',
                                    module: 'lodash',
                                    resolves: [
                                        {
                                            id: 577,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 577,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 782,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path:
                                                'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1065,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'ban-sensitive-files>ggit>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            id: 1523,
                                            path: 'nsp>cli-table2>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'mem',
                                    resolves: [
                                        {
                                            id: 1084,
                                            path: 'nsp>yargs>os-locale>mem',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'minimist',
                                    resolves: [
                                        {
                                            id: 1179,
                                            path: 'ban-sensitive-files>ggit>optimist>minimist',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'review',
                                    module: 'yargs-parser',
                                    resolves: [
                                        {
                                            id: 1500,
                                            path: 'nsp>yargs>yargs-parser',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                            ],
                            advisories: {
                                '577': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 577,
                                    created: '2018-04-24T14:27:02.796Z',
                                    updated: '2018-04-24T14:27:13.049Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    reported_by: {
                                        name: 'Olivier Arteau (HoLyVieR)',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-3721'],
                                    vulnerable_versions: '<4.17.5',
                                    patched_versions: '>=4.17.5',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `__proto__` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.5 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/310443)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/577',
                                },
                                '782': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 782,
                                    created: '2019-02-13T16:16:53.770Z',
                                    updated: '2019-06-27T14:01:44.172Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: { link: '', name: 'asgerf' },
                                    reported_by: { link: '', name: 'asgerf' },
                                    module_name: 'lodash',
                                    cves: ['CVE-2018-16487'],
                                    vulnerable_versions: '<4.17.11',
                                    patched_versions: '>=4.17.11',
                                    overview:
                                        "Versions of `lodash` before 4.17.5 are vulnerable to prototype pollution. \n\nThe vulnerable functions are 'defaultsDeep', 'merge', and 'mergeWith' which allow a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n",
                                    recommendation:
                                        'Update to version 4.17.11 or later.',
                                    references:
                                        '- [HackerOne Report](https://hackerone.com/reports/380873)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/782',
                                },
                                '1065': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                        },
                                    ],
                                    id: 1065,
                                    created: '2019-07-15T17:22:56.990Z',
                                    updated: '2019-07-15T17:25:05.721Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                    },
                                    module_name: 'lodash',
                                    cves: ['CVE-2019-10744'],
                                    vulnerable_versions: '<4.17.12',
                                    patched_versions: '>=4.17.12',
                                    overview:
                                        'Versions of `lodash` before 4.17.12 are vulnerable to Prototype Pollution.  The function `defaultsDeep` allows a malicious user to modify the prototype of `Object` via `{constructor: {prototype: {...}}}` causing the addition or modification of an existing property that will exist on all objects.\n\n',
                                    recommendation:
                                        'Update to version 4.17.12 or later.',
                                    references:
                                        '- [Snyk Advisory](https://snyk.io/vuln/SNYK-JS-LODASH-450202)',
                                    access: 'public',
                                    severity: 'high',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1065',
                                },
                                '1084': {
                                    findings: [
                                        {
                                            version: '1.1.0',
                                            paths: [
                                                'nsp>yargs>os-locale>mem',
                                            ],
                                        },
                                    ],
                                    id: 1084,
                                    created: '2019-07-18T21:30:31.935Z',
                                    updated: '2019-11-19T23:31:37.349Z',
                                    deleted: null,
                                    title: 'Denial of Service',
                                    found_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Juan Campa',
                                        email: '',
                                    },
                                    module_name: 'mem',
                                    cves: [],
                                    vulnerable_versions: '<4.0.0',
                                    patched_versions: '>=4.0.0',
                                    overview: "Versions of `mem` prior to 4.0.0 are vulnerable to Denial of Service (DoS).  The package fails to remove old values from the cache even after a value passes its `maxAge` property. This may allow attackers to exhaust the system's memory if they are able to abuse the application logging.",
                                    recommendation: 'Upgrade to version 4.0.0 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/npm:mem:20180117)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-400',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 2,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1084',
                                },
                                '1179': {
                                    findings: [
                                        {
                                            version: '0.0.10',
                                            paths: [
                                                'ban-sensitive-files>ggit>optimist>minimist',
                                            ],
                                        },
                                    ],
                                    id: 1179,
                                    created: '2019-09-23T15:01:43.049Z',
                                    updated: '2020-03-18T19:41:45.921Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: 'https://www.checkmarx.com/resources/blog/',
                                        name: 'Checkmarx Research Team',
                                        email: '',
                                    },
                                    module_name: 'minimist',
                                    cves: [],
                                    vulnerable_versions: '<0.2.1 || >=1.0.0 <1.2.3',
                                    patched_versions: '>=0.2.1 <1.0.0 || >=1.2.3',
                                    overview: 'Affected versions of `minimist` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--__proto__.y=Polluted` adds a `y` property with value `Polluted` to all objects. The argument `--__proto__=Polluted` raises and uncaught error and crashes the application.  \nThis is exploitable if attackers have control over the arguments being passed to `minimist`.\n',
                                    recommendation: 'Upgrade to versions 0.2.1, 1.2.3 or later.',
                                    references: '- [GitHub commit 1](https://github.com/substack/minimist/commit/4cf1354839cb972e38496d35e12f806eea92c11f#diff-a1e0ee62c91705696ddb71aa30ad4f95)\n- [GitHub commit 2](https://github.com/substack/minimist/commit/63e7ed05aa4b1889ec2f3b196426db4500cbda94)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1179',
                                },
                                '1500': {
                                    findings: [
                                        {
                                            version: '7.0.0',
                                            paths: [
                                                'nsp>yargs>yargs-parser',
                                            ],
                                        },
                                    ],
                                    id: 1500,
                                    created: '2020-03-26T19:21:50.174Z',
                                    updated: '2020-05-01T01:05:15.020Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'Snyk Security Team',
                                        email: '',
                                    },
                                    module_name: 'yargs-parser',
                                    cves: [],
                                    vulnerable_versions: '<13.1.2 || >=14.0.0 <15.0.1 || >=16.0.0 <18.1.2',
                                    patched_versions: '>=13.1.2 <14.0.0 || >=15.0.1 <16.0.0 || >=18.1.2',
                                    overview: "Affected versions of `yargs-parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs-parser`.\n",
                                    recommendation: 'Upgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.',
                                    references: '- [Snyk Report](https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 1,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1500',
                                },
                                '1523': {
                                    findings: [
                                        {
                                            version: '4.17.4',
                                            paths: [
                                                'ban-sensitive-files>ggit>lodash',
                                            ],
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: [
                                                'nsp>cli-table2>lodash',
                                            ],
                                        },
                                    ],
                                    id: 1523,
                                    created: '2020-05-20T01:36:49.357Z',
                                    updated: '2020-07-10T19:23:46.395Z',
                                    deleted: null,
                                    title: 'Prototype Pollution',
                                    found_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    reported_by: {
                                        link: '',
                                        name: 'posix',
                                        email: '',
                                    },
                                    module_name: 'lodash',
                                    cves: [
                                        'CVE-2019-10744',
                                    ],
                                    vulnerable_versions: '<4.17.19',
                                    patched_versions: '>=4.17.19',
                                    overview: 'Versions of `lodash` prior to 4.17.19 are vulnerable to Prototype Pollution.  The function `zipObjectDeep` allows a malicious user to modify the prototype of `Object` if the property identifiers are user-supplied. Being affected by this issue requires zipping objects based on user-provided property arrays.  \n\nThis vulnerability causes the addition or modification of an existing property that will exist on all objects and may lead to Denial of Service or Code Execution under specific circumstances.',
                                    recommendation: 'Upgrade to version 4.17.19 or later.',
                                    references: '- [HackerOne Report](https://hackerone.com/reports/712065)\n- [GitHub Issue](https://github.com/lodash/lodash/issues/4744)',
                                    access: 'public',
                                    severity: 'low',
                                    cwe: 'CWE-471',
                                    metadata: {
                                        module_type: '',
                                        exploitability: 3,
                                        affected_components: '',
                                    },
                                    url: 'https://npmjs.com/advisories/1523',
                                },
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 11,
                                    moderate: 0,
                                    high: 8,
                                    critical: 0,
                                },
                                dependencies: 119,
                                devDependencies: 80,
                                optionalDependencies: 0,
                                totalDependencies: 199,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });
    });
}
