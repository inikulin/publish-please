'use strict';
module.exports = function simulateUserInput(inputs) {
    if (Array.isArray(inputs) && inputs.length === 0) {
        return;
    }
    const input = inputs.shift();
    setTimeout(() => {
        if (process.stdin.send) {
            process.stdin.send(input);
            simulateUserInput(inputs);
        }
    }, 1000);
};
