# Publish, please!

[![Build Status](https://travis-ci.org/inikulin/publish-please.svg?branch=master)](https://travis-ci.org/inikulin/publish-please)
[![npm version](https://img.shields.io/npm/v/publish-please.svg)](https://www.npmjs.com/package/publish-please)
[![Dependency Status](https://david-dm.org/inikulin/publish-please.svg)](https://david-dm.org/inikulin/publish-please)

<p align="center">
<i>Safe and highly functional replacement for `npm publish`.</i>
</p>
<p align="center">
    <img src="https://raw.githubusercontent.com/inikulin/publish-please/master/media/demo.gif" alt="demo" />
</p>

There are numerous ways to "shoot yourself in the foot" using `npm publish`. The purpose of this module is to replace
`npm publish` for your packages with safe and more functional alternative, which will allow you to:

 - Run tests or build steps before publishing (because `prepublish` is [broken](https://medium.com/greenkeeper-blog/what-is-npm-s-prepublish-and-why-is-it-so-confusing-a948373e6be1#.a40w9sdy6)).
 - Perform check for the [sensitive data](#sensitive-information-audit) in your package to be sure that you didn't leak it by accident (Further reading: [Do not underestimate credentials leaks](https://github.com/ChALkeR/notes/blob/master/Do-not-underestimate-credentials-leaks.md)).
 - Perform check for vulnerable dependencies using [Node Security Project](https://nodesecurity.io/) data.
 - Check that you are in the correct git branch.
 - Check that git tag matches version specified in the `package.json`.
 - Check that there are no uncommitted changes in the working tree.
 - Check that there are no untracked files in the working tree.
 - Force usage of the [npm publish tag](https://docs.npmjs.com/cli/publish) there necessary, so you'll be sure you're not publishing preview version of your package as a release version.
 - Get release summary and publishing confirmation.
 - Configure publishing using built-in configuration wizard.

## Getting started
Setup process of *publish-please* is quite trivial - just run
```shell
npm install --save-dev publish-please
```
in your project's directory.

Once it finish installing, *publish-please* will automatically run it's configuration wizard, which will guide you
through some simple steps to setup [features](#options) you want to use:

![config](https://raw.githubusercontent.com/inikulin/publish-please/master/media/config.png)

If you forgot to configure something or just changed your mind and want to change configuration, just run
```shell
npm run publish-please config
```
to return to wizard.

So, once you've done with wizard from now on `npm publish` for your package is disabled (Muahahaha :smiling_imp:):

![guard](https://raw.githubusercontent.com/inikulin/publish-please/master/media/guard.png)

But don't worry it's done for the good reason to prevent you or your co-workers run unsafe publishing process. Use awesome version
instead:
```shell
npm run publish-please
```


## Options

 - **prePublishScript** - Specifies command that will be run before publish (e.g. `npm test`). Use it for builds and tests. Default: `npm test`.
 - **postPublishScript** - Specifies command that will be run after successful publishing. Use it for release announcements, creating a GitHub release, uploading binaries, etc. Default: `` (no command).
 - **publishCommand** - Specifies publishing command which will be used to publish the package. Default: `npm publish`.
 - **publishTag** - Specifies tag with which package will be published. See [npm publish docs](https://docs.npmjs.com/cli/publish) for more info. Default: `latest`.
 - **confirm** - Ask for the confirmation before publishing. Default: `true`.

### Validations
 - **uncommittedChanges** - Check that there are no uncommitted changes in the working tree. Default: `true`.
 - **untrackedFiles** - Check that there are no untracked files in the working tree. Default: `true`.
 - **gitTag** - Check that git tag matches version specified in the `package.json`. Default: `true`.
 - **branch** - Check that current branch matches the specified branch. Default: `master`.
 - **sensitiveData** - Perform [audit for the sensitive data](#sensitive-information-audit). Default: `true`.
 - **vulnerableDependencies** - Perform vulnerable dependencies check using [Node Security Project](https://nodesecurity.io/) data. Default: `true`.
    - you may prevent specific vulnerabilities to be reported by publish-please by creating a [.nsprc file](https://github.com/nodesecurity/nsp#exceptions).
 

### Running in dry mode

You can execute publish-please in dry mode by using the `--dry-run` option:

```shell
npm run publish-please --dry-run
```

Instead of publishing, this will show (after all validations) the content of the package that will be sent to npm, so that you can inspect it to be sure everything is there.

![dry-run-demo](media/dry-run-demo.gif)

In this mode, the **postPublishScript** script will not run, since there is no publication to the registry. 

It might be a good idea to add these two lines inside your .gitignore file:
```sh
package
*.tgz
```

## Sensitive information audit
**Important note:** tool provides some very basic sensitive data check. Do not rely on it fully. Always perform manual checks for the
sensitive data in your packages.

Performed for the following items:

 - Private SSH key
 - Potential cryptographic private key
 - Potential cryptographic key bundle
 - Pidgin OTR private key
 - Shell command history file
 - MySQL client command history file
 - PostgreSQL client command history file
 - Ruby IRB console history file
 - Pidgin chat client account configuration file
 - Hexchat/XChat IRC client server list configuration file
 - Irssi IRC client configuration file
 - Recon-ng web reconnaissance framework API key database
 - DBeaver SQL database manager configuration file
 - Mutt e-mail client configuration file
 - S3cmd configuration file
 - T command-line Twitter client configuration file
 - OpenVPN client configuration file
 - Well, this is awkward... Gitrob configuration file
 - Shell configuration file
 - Shell profile configuration file
 - Shell command alias configuration file
 - Ruby On Rails secret token configuration file
 - OmniAuth configuration file
 - Carrierwave configuration file
 - Ruby On Rails database schema file
 - Potential Ruby On Rails database configuration file
 - Django configuration file
 - PHP configuration file
 - KeePass password manager database file
 - 1Password password manager database file
 - Apple Keychain database file
 - GNOME Keyring database file
 - Log file
 - Network traffic capture file
 - SQL dump file
 - GnuCash database file
 - Contains word: backup
 - Contains word: dump
 - Contains word: password
 - Contains words: private, key
 - Jenkins publish over SSH plugin file
 - Potential Jenkins credentials file
 - Apache htpasswd file
 - Configuration file for auto-login process
 - KDE Wallet Manager database file
 - Potential MediaWiki configuration file
 - Tunnelblick VPN configuration file
 - Rubygems credentials file
 - Potential MSBuild publish profile
 - PHP dotenv

## Upgrading to latest publish-please version

- If you are running node 8 or above, and if you have in the `package.json` file an already existing `prepublish` script, you should rename that script to `prepublishOnly` after you have upgraded publish-please. 

- Run `npm help scripts` to get more details.

## Check out my other packages used by this tool
- [cp-sugar](https://github.com/inikulin/cp-sugar) - Some sugar for child_process module.
- [elegant-status](https://github.com/inikulin/elegant-status) - Create elegant task status for CLI.
- [pkgd](https://github.com/inikulin/pkgd) - Get package publish info: package.json and file list.
- [promisify-event](https://github.com/inikulin/promisify-event) - Promisify EventEmitter's event.

## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
