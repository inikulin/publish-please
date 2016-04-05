const pathJoin = require('path').join;
const readPkg  = require('read-pkg');

function getTestModeDir () {
    for (let i = 0; i < process.argv.length; i++) {
        const arg   = process.argv[i];
        const match = arg.match(/^test-mode=.+$/);

        if (match)
            return match[1];
    }
}

function readCfg (projectDir) {
    try {
        return readPkg.sync(projectDir);
    }
    catch (err) {
        return null;
    }
}

function reportNoConfig () {
    // TODO
}

function addConfigHooks (/*cfg, projectDir*/) {
    // TODO
}

function addPublishConfig (/*projectDir*/) {
    // TODO
}

(function init () {
    let testMode = false;
    let libDir   = __dirname;

    const testModeDir = getTestModeDir();

    if (testModeDir) {
        testMode = true;
        libDir   = testModeDir;
    }

    // NOTE: <projectDir>/node_modules/publish-please/lib
    const projectDir = pathJoin(libDir, '../../../');
    const cfg        = readCfg(projectDir);

    if (!cfg) {
        if (!testMode)
            reportNoConfig();

        process.exit(1);
    }

    addConfigHooks(cfg, projectDir);
    addPublishConfig(projectDir);
})();
