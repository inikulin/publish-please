# Publish, please!

[![Build Status](https://api.travis-ci.org/inikulin/publish-please.svg)](https://travis-ci.org/inikulin/publish-please)

<p align="center">
<i>CLI tool and Gulp plugin that allows you publish npm modules safely and gracefully.</i>
</p>
<p align="center">
    <img src="https://raw.githubusercontent.com/inikulin/publish-please/master/media/demo.gif" alt="demo" />
</p>

## So what it does exactly?

 - Can run tests or build steps before publishing (because `prepublish` is [broken](https://medium.com/greenkeeper-blog/what-is-npm-s-prepublish-and-why-is-it-so-confusing-a948373e6be1#.a40w9sdy6)).
 - Performs [sensitive information audit](#sensitive-information-audit) (Further reading: [Do not underestimate credentials leaks](https://github.com/ChALkeR/notes/blob/master/Do-not-underestimate-credentials-leaks.md)).
 - Checks that you are in the correct git branch.
 - Checks that git tag matches version specified in the `package.json`.
 - Checks that there are no uncommitted changes in the working tree.
 - Checks that there are no untracked files in the working tree.
 - Can force usage of the [npm publish tag](https://docs.npmjs.com/cli/publish).
 - Provides release summary and asks for the confirmation.
 - Can be configured via `.publishrc` file.
 - Can be used as CLI tool or [Gulp](https://github.com/gulpjs/gulp) plugin.

## Install
### As CLI tool:
```
npm install -g publish-please
```

### As Gulp plugin:
```
npm install --save-dev publish-please
```


## Usage
### As CLI tool
```
cd to_your_project_dir
publish-please
```
That's it. You can change publish configuration using [.publishrc file](#publishrc-file).

### As Gulp plugin
```js
const gulp    = require('gulp');
const publish = require('publish-please');

...

// NOTE: you can setup prepublish actions as the dependency for the task
gulp.task('publish', ['test'], () => publish(options));
```

`options` will override options specified in the `.publishrc` file.

## Options

 - **confirm** - Ask for the confirmation before publishing. Default: `true`.
 - **sensitiveDataAudit** - Perform audit for the sensitive data. Default: `true`.
 - **checkUncommitted** - Check that there are no uncommitted changes in the working tree. Default: `true`.
 - **checkUntracked** - Check that there are no untracked files in the working tree. Default: `true`.
 - **validateGitTag** - Check that git tag matches version specified in the `package.json`. Default: `true`.
 - **validateBranch** - Check that current branch matches the specified branch. Default: `master`.
 - **tag** - Specifies tag with which package will be published. See [npm publish docs](https://docs.npmjs.com/cli/publish) for more info. Default: `latest`.
 - **prepublishScript** - Specifies command that will be run before publish (e.g. `npm test`). Use it for builds and tests. Default: `null`.

## .publishrc file
You can specify publish options in the JSON form via `.publishrc` file in your project directory. E.g.:
```json
{
    "validateGitTag":   false,
    "validateBranch":   "master",
    "tag":              "beta",
    "prepublishScript": "mocha"
}
```

## Sensitive information audit
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


## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
