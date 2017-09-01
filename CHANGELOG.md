# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## `[Latest]` v0.8.0 - 2017-09-01

### Added
- Switched to a webpack based config.
- Added babel config to transpile es6 to es5.
- Switched typescript to target es6.
- Switched to `dts-bundle`.
- Adding `Dropbox` configuration as default.

### Changed
- Observer in `Storage` now is a **Hot observable** instead.

### Removed
- browserify configuration and related code.

### Fixed Issues
- #35 - Now uses tree shaking to remove unnecessary `lodash` code.