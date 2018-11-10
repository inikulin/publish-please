'use strict';
const pathJoin = require('path').join;
const writeFile = require('fs').writeFileSync;
const readPkg = require('./utils/read-package-json').readPkgSync;
const getProjectDir = require('./utils/get-project-dir');
const nodeInfos = require('./utils/get-node-infos').getNodeInfosSync();
const shouldUsePrePublishOnlyScript = nodeInfos.shouldUsePrePublishOnlyScript;
const reporter = require('./reporters/current');

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
    function reportNoConfig() {
        reporter.current().reportError(NO_CONFIG_MESSAGE);
    }

    function reportNoHooksOnItself() {
        reporter.current().reportInformation(POST_INSTALL_HOOKS_ARE_IGNORED);
    }

    function reportHooksAdded() {
        reporter.current().reportSuccess(HOOKS_ADDED_MESSAGE);
    }

    function reportCompletion() {
        reporter.current().reportSuccess(COMPLETION_MESSAGE);
    }

    function reportDeprecationNoteOnPrePublish() {
        reporter.current().reportInformation(DEPRECATION_NOTE_ON_PREPUBLISH);
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

    function addConfigHooks(pkg) {
        pkg.scripts = pkg.scripts || {};
        if (pkg.scripts['publish-please']) return false;

        pkg.scripts['publish-please'] = 'publish-please';

        const prepublishKey = getPrePublishKey(pkg.scripts);
        const existingPrepublishScript = pkg.scripts[prepublishKey];
        pkg.scripts[prepublishKey] = existingPrepublishScript
            ? `publish-please guard && ${existingPrepublishScript}`
            : 'publish-please guard';

        writeFile(
            pathJoin(projectDir, 'package.json'),
            JSON.stringify(pkg, null, 2)
        );

        return true;
    }

    return (function runInstallationSteps() {
        let pkg;
        try {
            pkg = readPkg(projectDir);
        } catch (error) {
            reportNoConfig();
            process.exit(1);
            return;
        }

        if (pkg && pkg.name === 'publish-please') {
            reportNoHooksOnItself();
            process.exit(0);
            return;
        }
        if (addConfigHooks(pkg)) {
            reportHooksAdded();
            const config = require('./config');
            const opts = config.getCurrentOpts(projectDir);
            return config.configurePublishPlease
                .with(opts)
                .inProject(projectDir)
                .then(reportCompletion);
        }
    })();
}

module.exports = function init(projectDir) {
    projectDir = projectDir || getProjectDir();
    return onInstall(projectDir);
};
