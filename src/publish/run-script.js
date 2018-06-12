'use strict';
const chalk = require('chalk');
const spawn = require('cp-sugar').spawn;
const emoji = require('node-emoji').emoji;

module.exports = function runScript(command, scriptType) {
    console.log(
        chalk.yellow(
            'Running ' + (scriptType ? scriptType + ' ' : '') + 'script'
        )
    );
    console.log(chalk.yellow('-------------------------'));

    return spawn(command).then(() => {
        console.log(chalk.yellow('-------------------------'));
        console.log(emoji['+1'], emoji['+1'], emoji['+1']);
        console.log('');
    });
};

module.exports.SCRIPT_TYPE = {
    prePublish: 'pre-publish',
    postPublish: 'post-publish',
};
