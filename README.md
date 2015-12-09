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
 - Checks that you are in the correct git branch.
 - Checks that git tag matches version specified in the `package.json`.
 - Checks that there are no uncommitted changes in the working tree.
 - Checks that there are no untracked files in the working tree (log files [can leak sensitive information](https://github.com/ChALkeR/notes/blob/master/Do-not-underestimate-credentials-leaks.md)).
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


## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
