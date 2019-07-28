# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html)

## [5.5.1] - 2019-07-28
### Fixed
- fix vulnerability in lodash (by [Phillip Manwaring](https://github.com/manwaring))

## [5.5.0] - 2019-07-01
### Added
- add the ability to use a tag prefix (by [Fredrik Wollsén](https://github.com/motin))

## [5.4.3] - 2018-12-02
### Changed
- align the README with all previous changes 

## [5.4.2] - 2018-11-29
### Fixed
- fix CI reporter on TeamCity

## [5.4.1] - 2018-11-26
### Fixed
- package 5.4.0 was published too early. Do not use it.

## [5.4.0] - 2018-11-26
### Changed
- dry-run workflow should not prompt for user input
### Fixed
- tgz file is left in project directory after successfull dry-run 
### Fixed
- last message showned in publishing workflow is not correct 

## [5.3.0] - 2018-11-21
### Added
- add a CI reporter and be able to automatically switch from elegant status reporter to CI reporter when running on CI 

## [5.2.0] - 2018-11-04
### Added
- be able to override .sensitivedata on per project basis

## [5.1.1] - 2018-10-30
### Fixed
- fix: tgz file is left in project directory after publishing 

## [5.1.0] - 2018-10-29
### Changed
- update/remove dependencies 

## [5.0.0] - 2018-10-27
### Fixed
- replace `ban-sensitive-files` dependency with a custom validator 

## [4.1.0] - 2018-10-13
### Added
- add branch validation via regular expression

## [4.0.1] - 2018-10-11
### Fixed
- fix: config helper hangs on Windows after answering first question

## [4.0.0] - 2018-10-01
### Fixed
- replace `nsp` by `npm audit`

## [3.2.0] - 2018-07-15
### Added
- be able to run publish-please with npx

## [3.1.1] - 2018-07-01
### Fixed
- gracefully handle prepublish vs prepublishOnly script on all node versions

## [3.1.0] - 2018-06-21
### Added
- be able to run publish-please in dry mode

## [3.0.3] - 2018-06-20
### Fixed
- fix install on npm 3.10.10

## [3.0.2] - 2018-06-12
### Fixed
- Support vulnerability exceptions from .nsprc file

## [3.0.1] - 2018-06-05
### Fixed
- installation on windows platform

## [3.0.0] - 2018-05-30
### Security
- update direct dependencies flagged as `Critical` and `High` vulnerabilities by npm audit
- this update causes the following breaking change: publish-please must run on node version >= 6.0.0
