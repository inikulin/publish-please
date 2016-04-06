const inquirer = require('inquirer');

function ask (type, question, defaultAnswer) {
    return new Promise(resolve => {
        inquirer.prompt({
            type:    type,
            name:    'prop',
            message: question,
            default: defaultAnswer
        }, answer => resolve(answer['prop']));
    });
}

const confirm = exports.confirm = function (question, defaultAnswer) {
    return ask('confirm', question, defaultAnswer);
};

const input = exports.input = function (question, defaultAnswer) {
    return ask('input', question, defaultAnswer);
};

exports.inputWithConfirmation = function (confirmQuestion, inputQuestion, defaultAnswer) {
    return confirm(confirmQuestion, true)
        .then(yes => yes ? input(inputQuestion, defaultAnswer) : defaultAnswer);
};
