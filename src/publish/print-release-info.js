'use strict';
const exec = require('cp-sugar').exec;
const chalk = require('chalk');

module.exports = function printReleaseInfo(pkgVersion, publishTag) {
    let commitInfo = null;

    return exec('git log -1 --oneline')
        .then((info) => {
            commitInfo = info;

            return exec('npm whoami --silent');
        })
        .catch(() => chalk.red('<not logged in>'))
        .then((publisher) => {
            console.log(chalk.yellow('Release info'));
            console.log(chalk.yellow('------------'));
            console.log('  ' + chalk.magenta('Version:       ') + pkgVersion);
            console.log('  ' + chalk.magenta('Latest commit: ') + commitInfo);
            console.log('  ' + chalk.magenta('Publish tag:   ') + publishTag);
            console.log('  ' + chalk.magenta('Publisher:     ') + publisher);
            console.log('');
        });
};
