# Publish, please!
Safe and highly functional replacement for `npm publish`.

[![Build Status](https://travis-ci.org/inikulin/publish-please.svg?branch=master)](https://travis-ci.org/inikulin/publish-please)
[![npm version](https://img.shields.io/npm/v/publish-please.svg)](https://www.npmjs.com/package/publish-please)
[![Dependency Status](https://david-dm.org/inikulin/publish-please.svg)](https://david-dm.org/inikulin/publish-please)


## Validate your package before publishing to the registry

There are numerous ways to "shoot yourself in the foot" using `npm publish`. 

`publish-please` enables you to check that what will be sent to the registry is valid, free of vulnerabilities and free of useless files.

Before running `npm publish`,  run this command at the root of your project folder:

```sh
npx publish-please --dry-run
```

This example shows up that you are about to push your test files to the registry:

![dry-run-demo-with-errors](media/dry-run-with-errors.gif)

When all validations pass, publish-please will show you the exact content of the package that will be sent to the registry, so you can check everything is included in the package:

![dry-run-demo-success](media/dry-run-demo-success.gif)

### **The validation workflow performs by default the following actions:**
- **npm test**
    - Check that all tests pass

- **Checking for the vulnerable dependencies**
    - Perform vulnerable dependencies check using `npm audit`

- **Checking for the uncommitted changes**
    - Check that there are no uncommitted changes in the working tree

- **Checking for the untracked files**
    - Check that there are no untracked files in the working tree

- **Checking for the sensitive and non-essential data in the npm package**
    - Check that the npm package will not embed sensitive files or useless files (like test files)

- **Validating branch** 
    - Check that current branch is master
    
- **Validating git tag**
    - Check that git tag matches version specified in the `package.json`



[to be continued]