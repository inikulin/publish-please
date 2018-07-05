'use strict';

module.exports.arg = function(input) {
    return {
        is: (predicate) => {
            return predicate(input);
        },
    };
};

module.exports.npmCommand = function(args) {
    const isValidArgs = args && args.cooked && Array.isArray(args.cooked);
    return {
        hasArg: (arg) => {
            return isValidArgs
                ? args.cooked.filter((a) => a === arg).length > 0
                : false;
        },
        hasArgThatContains: (substring) => {
            /* prettier-ignore */
            return isValidArgs
                ? args.cooked.filter((a) => a && a.includes(substring)).length > 0
                : false;
        },
    };
};
