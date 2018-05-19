'use strict';

function onInstall(testMode, npmArgs) {
    const pathJoin = require('path').join;
    const writeFile = require('fs').writeFileSync;
    const readPkg = require('read-pkg');
    const chalk = require('chalk');

    function readCfg(projectDir) {
        try {
            return readPkg.sync(projectDir, { normalize: false });
        } catch (err) {
            return null;
        }
    }

    function reportNoConfig() {
        console.log(
            chalk.bgRed(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
        console.log(
            chalk.bgRed(
                "!! Unable to setup publish-please: project's package.json either missing !!",
            ),
        );
        console.log(
            chalk.bgRed(
                '!! or malformed. Run `npm init` and then reinstall publish-please.       !!',
            ),
        );
        console.log(
            chalk.bgRed(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
    }

    function reportGlobalInstall() {
        console.log(
            chalk.bgRed(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
        console.log(
            chalk.bgRed(
                "!! Starting from v2.0.0 publish-please can't be installed globally.      !!",
            ),
        );
        console.log(
            chalk.bgRed(
                '!! Use local installation instead.                                       !!',
            ),
        );
        console.log(
            chalk.bgRed(
                '!! (learn more: https://github.com/inikulin/publish-please#readme).      !!',
            ),
        );
        console.log(
            chalk.bgRed(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
    }

    function reportHooksAdded() {
        console.log(
            chalk.bgGreen(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! publish-please hooks were successfully setup for the project. !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! Now follow few simple steps to configure your publishing...   !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
    }

    function reportCompletion() {
        console.log(
            chalk.bgGreen(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! publish-please was successfully installed for the project. !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! Use `npm run publish-please` command for publishing.       !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! Use `npm run publish-please config` command to adjust      !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!! publishing configuration.                                  !!',
            ),
        );
        console.log(
            chalk.bgGreen(
                '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            ),
        );
    }

    function addConfigHooks(cfg, projectDir) {
        if (!cfg.scripts) cfg.scripts = {};

        if (cfg.scripts['publish-please']) return false;

        cfg.scripts['publish-please'] = 'publish-please';
        cfg.scripts['prepublish'] = cfg.scripts['prepublish']
            ? `publish-please guard && ${cfg.scripts['prepublish']}`
            : 'publish-please guard';

        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(cfg, null, 2),
        );

        return true;
    }

    (function runInstallationSteps() {
        if (!testMode && npmArgs.indexOf('--global') > -1) {
            reportGlobalInstall();
            process.exit(1);
        }

        // NOTE: <projectDir>/node_modules/publish-please/lib
        const projectDir = pathJoin(__dirname, '../../../');
        const cfg = readCfg(projectDir);

        if (!cfg) {
            reportNoConfig();
            process.exit(1);
        } else if (addConfigHooks(cfg, projectDir)) {
            reportHooksAdded();

            if (!testMode)
                require('./config')(projectDir).then(reportCompletion);
        }
    })();
}

(function init() {
    const testMode = process.argv.indexOf('--test-mode') > -1;
    const getNpmArgs = require('./utils/get-npm-args');
    const npmArgs = getNpmArgs();

    // NOTE: don't run on dev installation (running `npm install` in this repo)
    if (
        !testMode &&
        (!npmArgs || !npmArgs.some(arg => /^publish-please(@\S+)?$/.test(arg)))
    )
        return;

    onInstall(testMode, npmArgs);
})();
