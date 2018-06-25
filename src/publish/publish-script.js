'use strict';

const spawn = require('cp-sugar').spawn;
const emoji = require('node-emoji').emoji;

/* eslint-disable indent */
module.exports = function publish(publishCommand, publishTag) {
    const command = `${publishCommand} --tag ${publishTag} --with-publish-please`;
    return spawn(command)
        .then((res) => {
            console.log('\n', emoji.tada, emoji.tada, emoji.tada);
            return res || true;
        })
        .then(() => command);
};
