'use strict';

const exec           = require('child_process').exec;
const spawn          = require('cross-spawn-async');
const promisifyEvent = require('promisify-event');
const throwError     = require('./throw-error');


module.exports = {
    exec (command) {
        return new Promise((resolve, reject) => {
            exec(command, (err, stdout) => {
                if (err)
                    reject(err);
                else
                    resolve(stdout.trim());
            });
        });
    },

    spawn (command, testMode) {
        const args = command.split(/\s/);

        command = args.shift();

        const stdio = testMode ? 'ignore' : 'inherit';
        const proc  = spawn(command, args, { stdio: stdio });

        const error = promisifyEvent(proc, 'error')
            .catch(err => throwError('Command `' + command + '` thrown error: \n' + err.message));

        const completion = promisifyEvent(proc, 'exit')
            .then(code => {
                code = Array.isArray(code) ? code[0] : code;

                if (code !== 0)
                    throwError('Command `' + command + '` exited with code ' + code + '.');

                return code;
            });

        return Promise.race([completion, error]);
    }
};
