'use strict';
const pathSeparator = require('path').sep;

module.exports = function getNpxArgs(process) {
    const npxArgs = {};

    const args = process && process.argv ? process.argv : [];

    npxArgs['--dry-run'] =
        npxCommand(args).hasArg('--dry-run') &&
        npxCommand(args).hasArgThatContains(
            `${pathSeparator}_npx${pathSeparator}`
        );
    return npxArgs;
};

function npxCommand(args) {
    const isValidArgs = args && Array.isArray(args);
    return {
        hasArg: (arg) => {
            return isValidArgs
                ? args.filter((a) => a === arg).length > 0
                : false;
        },
        hasArgThatContains: (substring) => {
            /* prettier-ignore */
            return isValidArgs ?
                args.filter((a) => a && a.includes(substring)).length > 0 :
                false;
        },
    };
}
