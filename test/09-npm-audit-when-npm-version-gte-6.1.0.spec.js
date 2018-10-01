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
                                    target: '2.1.1',
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
                                            dev: false,
                                            optional: false,
                                            bundled: false,
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
                                    module: 'lodash',
                                    depth: 3,
                                    target: '4.17.11',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
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
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                            dev: false,
                                            optional: false,
                                            bundled: false,
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
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 3,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 315,
                                devDependencies: 0,
                                optionalDependencies: 0,
                                totalDependencies: 315,
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
                                    action: 'install',
                                    module: 'lodash',
                                    target: '4.17.11',
                                    isMajor: false,
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
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
                                            version: '4.16.4',
                                            paths: ['lodash'],
                                            dev: false,
                                            optional: false,
                                            bundled: false,
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
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 1,
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

        it('Should not report vulnerability stored in .auditignore file ', () => {
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

        it('Should report vulnerability that is not stored in .auditignore file ', () => {
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
                                    action: 'install',
                                    module: 'lodash',
                                    target: '4.17.11',
                                    isMajor: false,
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'update',
                                    module: 'lodash',
                                    depth: 3,
                                    target: '4.17.11',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
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
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                            dev: true,
                                            optional: false,
                                            bundled: false,
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
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 4,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 164,
                                devDependencies: 153,
                                optionalDependencies: 0,
                                totalDependencies: 317,
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
                                    action: 'install',
                                    module: 'lodash',
                                    target: '4.17.11',
                                    isMajor: false,
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
                                },
                                {
                                    action: 'update',
                                    module: 'lodash',
                                    depth: 3,
                                    target: '4.17.11',
                                    resolves: [
                                        {
                                            id: 577,
                                            path: 'nsp>inquirer>lodash',
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                    ],
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
                                            dev: false,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            version: '4.16.4',
                                            paths: [
                                                'lodash',
                                                'nsp>inquirer>lodash',
                                            ],
                                            dev: true,
                                            optional: false,
                                            bundled: false,
                                        },
                                        {
                                            version: '3.10.1',
                                            paths: ['nsp>cli-table2>lodash'],
                                            dev: true,
                                            optional: false,
                                            bundled: false,
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
                            },
                            muted: [],
                            metadata: {
                                vulnerabilities: {
                                    info: 0,
                                    low: 4,
                                    moderate: 0,
                                    high: 0,
                                    critical: 0,
                                },
                                dependencies: 164,
                                devDependencies: 153,
                                optionalDependencies: 0,
                                totalDependencies: 317,
                            },
                        };
                        result.should.containDeep(expected);
                    })
            );
        });
    });
}
