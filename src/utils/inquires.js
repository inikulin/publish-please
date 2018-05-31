const inquirer = require('inquirer');
const Promise = require('pinkie-promise');

function ask(type, question, defaultAnswer) {
    return new Promise((resolve) => {
        inquirer
            .prompt({
                type: type,
                name: 'prop',
                message: question,
                default: defaultAnswer,
            })
            .then((answer) => {
                resolve(answer['prop']);
            });
    });
}

const confirm = (exports.confirm = function(question, defaultAnswer) {
    return ask('confirm', question, defaultAnswer);
});

const input = (exports.input = function(question, defaultAnswer) {
    return ask('input', question, defaultAnswer);
});

exports.inputWithConfirmation = function(
    confirmQuestion,
    denialAnswer,
    inputQuestion,
    defaultAnswer
) {
    return confirm(confirmQuestion, true).then(
        (yes) => (yes ? input(inputQuestion, defaultAnswer) : denialAnswer)
    );
};

exports.inputList = function(question, defaultAnswer) {
    return input(question, defaultAnswer).then(
        (answer) => (Array.isArray(answer) ? answer : answer.split(/,\s*/))
    );
};
