# Publish, please!

[![Build Status](https://api.travis-ci.org/inikulin/publish-please.svg)](https://travis-ci.org/inikulin/publish-please)

<p align="center">
<i>CLI tool and Gulp plugin that allows you publish npm modules safely and gracefully.</i>
</p>
<p align="center">
    <img src="https://raw.githubusercontent.com/inikulin/publish-please/master/media/demo.gif" alt="demo" />
</p>

## So what it does exactly?

 - Can run tests or build steps before publishing.
 - Checks that you are in the correct git branch.
 - Checks that git tag matches version specified in the `package.json`.
 - Checks for the uncommitted changes in the working tree.
 - Checks for the untracked files in the working tree.
 - Can force usage of the [npm publish tag](https://docs.npmjs.com/cli/publish).
 - Provides release summary and asks for the confirmation.
 - Can be configured via `.publishrc` file.
 - Can be used as CLI tool or [Gulp](https://github.com/gulpjs/gulp) plugin.

## Install
As CLI tool:
```
npm install -g publish-please
```

As Gulp plugin:
```
npm install --save-dev publish-please
```


## Usage
TODO

## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
