const reporter = require('../reporters/current');

const validations = [
    require('./vulnerable-dependencies'),
    require('./uncommitted-changes'),
    require('./untracked-files'),
    require('./sensitive-data'),
    require('./branch'),
    require('./git-tag'),
];

function runValidation(validation, param, pkg, errs) {
    const done = reporter.current().reportRunningTask(validation.statusText);

    // prettier-ignore
    return validation
        .run(param, pkg)
        .then(() => done(true))
        .catch((err) => {
            Array.isArray(err) ?
                errs.push(...err) :
                errs.push(err);
            done(false);
        });
}

function skipValidation(validation, errs) {
    const done = reporter.current().reportRunningTask(validation.statusText);
    return Promise.resolve()
        .then(() => errs.push(validation.whyCannotRun()))
        .then(() => done(false));
}

module.exports = {
    DEFAULT_OPTIONS: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.canRun()
            ? validation.defaultParam
            : false;

        return opts;
    }, {}),

    configurators: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.configurator;
        return opts;
    }, {}),

    validate: function(opts, pkg) {
        const errs = [];
        const validationsToRun = validations.filter(
            (validation) => !!opts[validation.option]
        );

        if (!validationsToRun.length) return Promise.resolve();

        reporter.current().reportRunningSequence('Running validations');

        return validationsToRun
            .reduce((validationChain, validation) => {
                return validationChain.then(
                    () =>
                        // prettier-ignore
                        validation.canRun()
                            ? runValidation(
                                validation,
                                opts[validation.option],
                                pkg,
                                errs)
                            : skipValidation(validation, errs)
                );
            }, Promise.resolve())
            .then(() => {
                if (errs.length) {
                    const msg = errs.map((err) => '  * ' + err).join('\n');
                    throw new Error(msg);
                }
                reporter
                    .current()
                    .reportSucceededSequence('Validations passed');
            });
    },
};
