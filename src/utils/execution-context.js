module.exports.isInTestMode = isInTestMode;

function isInTestMode() {
    try {
        if (process.env.PUBLISH_PLEASE_TEST_MODE) {
            return true;
        }
        throw new Error('check execution context');
    } catch (error) {
        if (error.stack && error.stack.indexOf('at Mocha.run') > -1) {
            return true;
        }
        return false;
    }
}
