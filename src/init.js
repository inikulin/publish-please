'use strict';
const pathJoin = require('path').join;
const writeFile = require('fs').writeFileSync;
const readPkg = require('read-pkg');
const chalk = require('chalk');
const getProjectDir = require('./utils/get-project-dir');
const versions = require('./utils/get-node-infos').getCurrentNodeAndNpmVersionsSync();
const shouldUsePrePublishOnlyScript = versions.shouldUsePrePublishOnlyScript;

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

const POST_INSTALL_HOOKS_ARE_IGNORED = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! post-install hooks are ignored in dev mode !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

const DEPRECATION_NOTE_ON_PREPUBLISH = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! prepublish script in package.json              !!
!! should be renamed to prepublishOnly            !!
!! See the deprecation note in 'npm help scripts' !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;

function onInstall(projectDir) {
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
        console.log(chalk.inverse(POST_INSTALL_HOOKS_ARE_IGNORED));
    }

    function reportHooksAdded() {
        console.log(chalk.bgGreen(HOOKS_ADDED_MESSAGE));
    }

    function reportCompletion() {
        console.log(chalk.bgGreen(COMPLETION_MESSAGE));
    }

    function reportDeprecationNoteOnPrePublish() {
        console.log(chalk.inverse(DEPRECATION_NOTE_ON_PREPUBLISH));
    }

    function getPrePublishKey(scripts) {
        if (shouldUsePrePublishOnlyScript && scripts['prepublish']) {
            reportDeprecationNoteOnPrePublish();
            return 'prepublish';
        }

        if (shouldUsePrePublishOnlyScript) {
            return 'prepublishOnly';
        }

        return 'prepublish';
    }

    function addConfigHooks(cfg) {
        if (!cfg.scripts) cfg.scripts = {};

        if (cfg.scripts['publish-please']) return false;

        cfg.scripts['publish-please'] = 'publish-please';

        const prepublishKey = getPrePublishKey(cfg.scripts);
        const existingPrepublishScript = cfg.scripts[prepublishKey];
        cfg.scripts[prepublishKey] = existingPrepublishScript
            ? `publish-please guard && ${existingPrepublishScript}`
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
        if (addConfigHooks(cfg)) {
            reportHooksAdded();
            const config = require('./config');
            const opts = config.getCurrentOpts(projectDir);
            config.configurePublishPlease
                .with(opts)
                .inProject(projectDir)
                .then(reportCompletion);
        }
    })();
}

module.exports = function init(projectDir) {
    projectDir = projectDir ? projectDir : getProjectDir();
    onInstall(projectDir);
};
