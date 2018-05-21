'use strict';

const noConfigMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! Unable to setup publish-please: project's package.json either missing !!
!! or malformed. Run 'npm init' and then reinstall publish-please.       !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const hooksAddedMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! publish-please hooks were successfully setup for the project. !!
!! Now follow few simple steps to configure your publishing...   !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const completionMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! publish-please was successfully installed for the project. !!
!! Use 'npm run publish-please' command for publishing.       !!
!! Use 'npm run publish-please config' command to adjust      !!
!! publishing configuration.                                  !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function onInstall(testMode) {
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
        console.log(chalk.bgRed(noConfigMessage));
    }

    function reportHooksAdded() {
        console.log(chalk.bgGreen(hooksAddedMessage));
    }

    function reportCompletion() {
        console.log(chalk.bgGreen(completionMessage));
    }

    function addConfigHooks(cfg, projectDir) {
        console.log('addConfigHooks');
        if (!cfg.scripts) cfg.scripts = {};

        if (cfg.scripts['publish-please']) return false;

        cfg.scripts['publish-please'] = 'publish-please';
        cfg.scripts['prepublishOnly'] = cfg.scripts['prepublishOnly']
            ? `publish-please guard && ${cfg.scripts['prepublishOnly']}`
            : 'publish-please guard';

        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(cfg, null, 2)
        );

        return true;
    }

    (function runInstallationSteps() {
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
    onInstall(testMode);
})();
