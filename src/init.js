'use strict';
const pathJoin = require('path').join;
const writeFile = require('fs').writeFileSync;
const readPkg = require('read-pkg');
const chalk = require('chalk');
const getProjectDir = require('./utils/get-project-dir');

const NO_CONFIG_MESSAGE = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! Unable to setup publish-please: project's package.json either missing !!
!! or malformed. Run 'npm init' and then reinstall publish-please.       !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const HOOKS_ADDED_MESSAGE = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! publish-please hooks were successfully setup for the project. !!
!! Now follow few simple steps to configure your publishing...   !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const COMPLETION_MESSAGE = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! publish-please was successfully installed for the project. !!
!! Use 'npm run publish-please' command for publishing.       !!
!! Use 'npm run publish-please config' command to adjust      !!
!! publishing configuration.                                  !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const NO_HOOKS_CAN_BE_ADDED_ON_ITSELF = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! publish-please hooks setup is canceled      !!
!! You cannot do this on publish-please itself !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function onInstall(projectDir, testMode) {
    function readCfg() {
        try {
            return readPkg.sync(projectDir, { normalize: false });
        } catch (err) {
            return null;
        }
    }

    function reportNoConfig() {
        console.log(chalk.bgRed(NO_CONFIG_MESSAGE));
    }

    function reportNoHooksOnItself() {
        console.log(chalk.bgYellow(NO_HOOKS_CAN_BE_ADDED_ON_ITSELF));
    }

    function reportHooksAdded() {
        console.log(chalk.bgGreen(HOOKS_ADDED_MESSAGE));
    }

    function reportCompletion() {
        console.log(chalk.bgGreen(COMPLETION_MESSAGE));
    }

    function addConfigHooks(cfg) {
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
        const cfg = readCfg();

        if (!cfg) {
            reportNoConfig();
            process.exit(1);
            return;
        }
        if (cfg && cfg.name === 'publish-please') {
            reportNoHooksOnItself();
            process.exit(0);
            return;
        }
        if (addConfigHooks(cfg, projectDir)) {
            reportHooksAdded();

            if (!testMode) {
                const config = require('./config');
                const opts = config.getCurrentOpts(projectDir);
                config.configurePublishPlease
                    .with(opts)
                    .inProject(projectDir)
                    .then(reportCompletion);
            }
        }
    })(projectDir);
}

module.exports = function init(projectDir) {
    projectDir = projectDir ? projectDir : getProjectDir();
    const testMode = process.argv.indexOf('--test-mode') > -1;
    onInstall(projectDir, testMode);
};
