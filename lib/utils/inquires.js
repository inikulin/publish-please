'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var inquirer = require('inquirer');

function ask(type, question, defaultAnswer) {
    return new _promise2.default(function (resolve) {
        inquirer.prompt({
            type: type,
            name: 'prop',
            message: question,
            default: defaultAnswer
        }, function (answer) {
            return resolve(answer['prop']);
        });
    });
}

var confirm = exports.confirm = function (question, defaultAnswer) {
    return ask('confirm', question, defaultAnswer);
};

var input = exports.input = function (question, defaultAnswer) {
    return ask('input', question, defaultAnswer);
};

exports.inputWithConfirmation = function (confirmQuestion, denialAnswer, inputQuestion, defaultAnswer) {
    return confirm(confirmQuestion, true).then(function (yes) {
        return yes ? input(inputQuestion, defaultAnswer) : denialAnswer;
    });
};

exports.inputList = function (question, defaultAnswer) {
    return input(question, defaultAnswer).then(function (answer) {
        return Array.isArray(answer) ? answer : answer.split(/,\s*/);
    });
};