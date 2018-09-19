'use strict';

/* eslint-disable no-unused-vars */
const should = require('should');
const pathJoin = require('path').join;
const mkdirp = require('mkdirp');
const del = require('del');
const writeFile = require('fs').writeFileSync;
const EOL = require('os').EOL;
const audit = require('../lib//utils/npm-audit');
const lineSeparator = '----------------------------------';

describe('npm audit analyzer', () => {
    let originalWorkingDirectory;
    before(() => {
        originalWorkingDirectory = process.cwd();
        mkdirp.sync('test/tmp/audit');
    });
    beforeEach(() => {
        console.log(`${lineSeparator} begin test ${lineSeparator}`);
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        del.sync(pathJoin(projectDir, 'package.json'));
        del.sync(pathJoin(projectDir, 'package-lock.json'));
        del.sync(pathJoin(projectDir, '.auditignore'));
        del.sync(pathJoin(projectDir, 'audit.opts'));
    });
    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        console.log(`${lineSeparator} end test ${lineSeparator}\n`);
    });
    it('Should handle errors when auto-generated package-lock.json cannot be deleted', () => {
        // Given
        const projectDir = null;
        const response = {
            yo: 123,
            actions: ['yo123'],
            vulnerabilities: {
                '777': {
                    yo: 123,
                },
            },
        };

        // When
        const result = audit.removePackageLockFrom(projectDir, response);

        // Then
        result.should.containDeep(response);
        Array.isArray(result.internalErrors).should.be.true();
        result.internalErrors[0].should.be.Error();
    });

    it('Should handle errors when removing ignored vulnerabilities', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditIgnore = ['https://nodesecurity.io/advisories/46'];
        writeFile(pathJoin(projectDir, '.auditignore'), auditIgnore.join(EOL));

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        const response = {
            actions: null,
            vulnerabilities: null,
        };

        // When
        const result = audit.removeIgnoredVulnerabilities(response, options);

        // Then
        result.should.containDeep(response);
        Array.isArray(result.internalErrors).should.be.true();
        result.internalErrors[0].should.be.Error();
    });

    it('Should handle errors when removing ignored vulnerabilities but response is null', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditIgnore = ['https://nodesecurity.io/advisories/46'];
        writeFile(pathJoin(projectDir, '.auditignore'), auditIgnore.join(EOL));

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        const response = null;

        // When
        const result = audit.removeIgnoredVulnerabilities(response, options);

        // Then
        (result === response).should.be.true();
    });

    it('Should set audit-level option to low when there is no audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');

        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': 'low',
        };
        result.should.containDeep(expected);
    });

    it('Should set audit-level option to low when audit.opts file is empty', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `

        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': 'low',
        };
        result.should.containDeep(expected);
    });

    [
        audit.auditLevel.low,
        audit.auditLevel.moderate,
        audit.auditLevel.high,
        audit.auditLevel.critical,
    ].forEach((auditLevel) => {
        it(`Should get '--audit-level=${auditLevel}'  option set in audit.opts file`, () => {
            // Given
            const projectDir = pathJoin(__dirname, 'tmp', 'audit');
            const auditOptions = `
                --debug
                --audit-level = ${auditLevel}  
                --json
            `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            const options = {
                directoryToAudit: projectDir,
                auditLogFilepath: pathJoin(projectDir, 'audit.log'),
                createLockLogFilepath: pathJoin(
                    projectDir,
                    'create-package-lock.log'
                ),
            };

            // When
            const result = audit.getNpmAuditOptions(options);

            // Then
            const expected = {
                '--audit-level': auditLevel,
            };
            result.should.containDeep(expected);
        });
    });

    [
        audit.auditLevel.low,
        audit.auditLevel.moderate,
        audit.auditLevel.high,
        audit.auditLevel.critical,
    ].forEach((auditLevel) => {
        it(`Should get '--audit-level ${auditLevel}'  option set in audit.opts file`, () => {
            // Given
            const projectDir = pathJoin(__dirname, 'tmp', 'audit');
            const auditOptions = `
                --debug
                --audit-level  ${auditLevel}  
                --json
            `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            const options = {
                directoryToAudit: projectDir,
                auditLogFilepath: pathJoin(projectDir, 'audit.log'),
                createLockLogFilepath: pathJoin(
                    projectDir,
                    'create-package-lock.log'
                ),
            };

            // When
            const result = audit.getNpmAuditOptions(options);

            // Then
            const expected = {
                '--audit-level': auditLevel,
            };
            result.should.containDeep(expected);
        });
    });

    [
        audit.auditLevel.low,
        audit.auditLevel.moderate,
        audit.auditLevel.high,
        audit.auditLevel.critical,
    ].forEach((auditLevel) => {
        it(`Should get '--audit-level ${auditLevel}'  option set in audit.opts file with different EOLs`, () => {
            // Given
            const projectDir = pathJoin(__dirname, 'tmp', 'audit');
            const auditOptions = `
                --debug\r
                # set audit level
                \r
                --audit-level  ${auditLevel} \n\r 
                --json\n
                \r
                \n
            `;
            writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
            const options = {
                directoryToAudit: projectDir,
                auditLogFilepath: pathJoin(projectDir, 'audit.log'),
                createLockLogFilepath: pathJoin(
                    projectDir,
                    'create-package-lock.log'
                ),
            };

            // When
            const result = audit.getNpmAuditOptions(options);

            // Then
            const expected = {
                '--audit-level': auditLevel,
            };
            result.should.containDeep(expected);
        });
    });

    it('Should get default audit-level option when option is set with invalid value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level = yo123  
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });

    it('Should get default audit-level option when option is set with empty value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level =   
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });

    it('Should get default audit-level option when option is set with no value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getNpmAuditOptions(options);

        // Then
        const expected = {
            '--audit-level': audit.auditLevel.low,
        };
        result.should.containDeep(expected);
    });

    it('Should get all levels when audit-level option is set with no value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getLevelsToAudit(options);

        // Then
        const expected = [
            audit.auditLevel.low,
            audit.auditLevel.moderate,
            audit.auditLevel.high,
            audit.auditLevel.critical,
        ];
        result.should.eql(expected);
    });

    it('Should get levels [critical,high,moderate,low] when audit-level option is set to low in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=low    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getLevelsToAudit(options);

        // Then
        const expected = [
            audit.auditLevel.low,
            audit.auditLevel.moderate,
            audit.auditLevel.high,
            audit.auditLevel.critical,
        ];
        result.should.eql(expected);
    });

    it('Should get levels [critical,high,moderate] when audit-level option is set to moderate in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=moderate    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getLevelsToAudit(options);

        // Then
        const expected = [
            audit.auditLevel.moderate,
            audit.auditLevel.high,
            audit.auditLevel.critical,
        ];
        result.should.eql(expected);
    });

    it('Should get levels [critical,high] when audit-level option is set to high in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=high    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getLevelsToAudit(options);

        // Then
        const expected = [audit.auditLevel.high, audit.auditLevel.critical];
        result.should.eql(expected);
    });

    it('Should get levels [critical] when audit-level option is set to critical in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=critical    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };

        // When
        const result = audit.getLevelsToAudit(options);

        // Then
        const expected = [audit.auditLevel.critical];
        result.should.eql(expected);
    });

    it('Should not filter response when option --audit-level is set with no value in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                    title: 'Regular Expression Denial of Service',
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
                    url: 'https://nodesecurity.io/advisories/46',
                },
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
                    recommendation: 'Update to version 4.17.5 or later.',
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
                    url: 'https://nodesecurity.io/advisories/577',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: -10,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                    title: 'Regular Expression Denial of Service',
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
                    url: 'https://nodesecurity.io/advisories/46',
                },
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
                    recommendation: 'Update to version 4.17.5 or later.',
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
                    url: 'https://nodesecurity.io/advisories/577',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: -10,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should not filter response when option --audit-level is set to "low" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=low    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                    title: 'Regular Expression Denial of Service',
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
                    url: 'https://nodesecurity.io/advisories/46',
                },
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
                    recommendation: 'Update to version 4.17.5 or later.',
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
                    url: 'https://nodesecurity.io/advisories/577',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: -10,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                    title: 'Regular Expression Denial of Service',
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
                    url: 'https://nodesecurity.io/advisories/46',
                },
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
                    recommendation: 'Update to version 4.17.5 or later.',
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
                    url: 'https://nodesecurity.io/advisories/577',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: -10,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should remove [low] vulnerabilities from response when option --audit-level is set to "moderate" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=moderate    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                '46': {
                    id: 46,
                    severity: 'moderate',
                },
                '577': {
                    id: 577,
                    severity: 'low',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
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
                    id: 46,
                    severity: 'moderate',
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
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should remove [low, moderate] vulnerabilities from response when option --audit-level is set to "high" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=high    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                '46': {
                    id: 46,
                    severity: 'moderate',
                },
                '577': {
                    id: 577,
                    severity: 'low',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 1,
                    moderate: 1,
                    high: 0,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
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
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should remove [low, moderate, high] vulnerabilities from response when option --audit-level is set to "critical" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=critical    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
            actions: [
                {
                    action: 'install',
                    module: 'yo123',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 123,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                '46': {
                    id: 46,
                    severity: 'moderate',
                },
                '577': {
                    id: 577,
                    severity: 'low',
                },
                '123': {
                    id: 123,
                    severity: 'high',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 1,
                    moderate: 1,
                    high: 1,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
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
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should remove [low, moderate, high] and keep [critical] vulnerabilities from response when option --audit-level is set to "critical" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=critical    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
            actions: [
                {
                    action: 'install',
                    module: 'yo777',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 777,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
                {
                    action: 'install',
                    module: 'yo123',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 123,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                '46': {
                    id: 46,
                    severity: 'moderate',
                },
                '577': {
                    id: 577,
                    severity: 'low',
                },
                '123': {
                    id: 123,
                    severity: 'high',
                },
                '777': {
                    id: 777,
                    severity: 'critical',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 1,
                    moderate: 1,
                    high: 1,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
        const expected = {
            actions: [
                {
                    action: 'install',
                    module: 'yo777',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 777,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
            ],
            advisories: {
                '777': {
                    id: 777,
                    severity: 'critical',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 0,
                    moderate: 0,
                    high: 0,
                    critical: 1,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });

    it('Should remove [low, moderate] and keep [critical, high] vulnerabilities from response when option --audit-level is set to "high" in audit.opts file', () => {
        // Given
        const projectDir = pathJoin(__dirname, 'tmp', 'audit');
        const auditOptions = `
            --debug
            --audit-level=high    
            --json
        `;
        writeFile(pathJoin(projectDir, 'audit.opts'), auditOptions);
        const options = {
            directoryToAudit: projectDir,
            auditLogFilepath: pathJoin(projectDir, 'audit.log'),
            createLockLogFilepath: pathJoin(
                projectDir,
                'create-package-lock.log'
            ),
        };
        const response = {
            actions: [
                {
                    action: 'install',
                    module: 'yo777',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 777,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
                {
                    action: 'install',
                    module: 'yo123',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 123,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
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
                            path: 'ban-sensitive-files>ggit>lodash',
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
                '46': {
                    id: 46,
                    severity: 'moderate',
                },
                '577': {
                    id: 577,
                    severity: 'low',
                },
                '123': {
                    id: 123,
                    severity: 'high',
                },
                '777': {
                    id: 777,
                    severity: 'critical',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 1,
                    moderate: 1,
                    high: 1,
                    critical: 0,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };

        // When
        const result = audit.removeIgnoredLevels(response, options);

        // Then
        const expected = {
            actions: [
                {
                    action: 'install',
                    module: 'yo777',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 777,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
                {
                    action: 'install',
                    module: 'yo123',
                    target: '2.1.1',
                    isMajor: true,
                    resolves: [
                        {
                            id: 123,
                            path: 'ms',
                            dev: false,
                            optional: false,
                            bundled: false,
                        },
                    ],
                },
            ],
            advisories: {
                '123': {
                    id: 123,
                    severity: 'high',
                },
                '777': {
                    id: 777,
                    severity: 'critical',
                },
            },
            muted: [],
            metadata: {
                vulnerabilities: {
                    info: 0,
                    low: 0,
                    moderate: 0,
                    high: 1,
                    critical: 1,
                },
                dependencies: 1,
                devDependencies: 2,
                optionalDependencies: 3,
                totalDependencies: 4,
            },
        };
        result.should.eql(expected);
    });
});
