'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pathJoin = require('path').join;
var writeFile = require('fs').writeFileSync;
var readPkg = require('read-pkg');
var chalk = require('chalk');

function readCfg(projectDir) {
    try {
        return readPkg.sync(projectDir);
    } catch (err) {
        return null;
    }
}

function reportNoConfig() {
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.bgRed("!! Unable to setup publish-please: project's package.json either missing !!"));
    console.log(chalk.bgRed('!! or malformed. Run `npm init` and then reinstall publish-please.       !!'));
    console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

function reportHooksAdded() {
    console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.bgGreen('!! publish-please hooks were successfully setup for the project. !!'));
    console.log(chalk.bgGreen('!! Now follow few simple steps to configure your publishing...   !!'));
    console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

function reportCompletion() {
    console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.bgGreen('!! publish-please was successfully installed for the project. !!'));
    console.log(chalk.bgGreen('!! Use `npm run publish-please` command for publishing.       !!'));
    console.log(chalk.bgGreen('!! Use `npm run publish-please config` command to adjust      !!'));
    console.log(chalk.bgGreen('!! publishing configuration.                                  !!'));
    console.log(chalk.bgGreen('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

function addConfigHooks(cfg, projectDir) {
    if (!cfg.scripts) cfg.scripts = {};

    if (cfg.scripts['publish-please']) return false;

    cfg.scripts['publish-please'] = 'publish-please';
    cfg.scripts['prepublish'] = cfg.scripts['prepublish'] ? 'publish-please guard && ' + cfg.scripts['prepublish'] : 'publish-please guard';

    writeFile(pathJoin(projectDir, 'package.json'), (0, _stringify2.default)(cfg, null, 2));

    return true;
}

(function init() {
    var testMode = process.argv.indexOf('--test-mode') > -1;

    // NOTE: don't run on dev installation (running `npm install` in this repo)
    if (!testMode) {
        var getNpmArgs = require('./utils/get-npm-args');
        var npmArgs = getNpmArgs();

        if (!npmArgs || !npmArgs.some(function (arg) {
            return (/^publish-please(@\d+\.\d+.\d+)?$/.test(arg)
            );
        })) return;
    }

    // NOTE: <projectDir>/node_modules/publish-please/lib
    var projectDir = pathJoin(__dirname, '../../../');
    var cfg = readCfg(projectDir);

    if (!cfg) {
        reportNoConfig();
        process.exit(1);
    } else if (addConfigHooks(cfg, projectDir)) {
        reportHooksAdded();

        if (!testMode) require('./config')(projectDir).then(reportCompletion);
    }
})();