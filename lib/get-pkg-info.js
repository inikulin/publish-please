'use strict';

const readFile   = require('fs').readFileSync;
const irishPub   = require('irish-pub');
const throwError = require('./throw-error');

module.exports = function pkgInfo () {
    const info = {
        version: null,
        files:   null
    };

    return Promise.resolve()
        .then(() => {
            try {
                info.version = JSON.parse(readFile('package.json').toString()).version;
            }
            catch (err) {
                throwError("Can't parse package.json: file doesn't exist or it's not a valid JSON file.");
            }

            if (!info.version)
                throwError('Version is not specified in package.json.');
        })
        .then(() => new Promise(resolve => {
            let data = '';

            // TODO
            irishPub(process.cwd())
                .on('data', chunk => data += chunk)
                .once('end', () => resolve(data));
        }))
        .then(data => {
            info.files = data.split(/\r?\n/g);

            return info;
        });
};
