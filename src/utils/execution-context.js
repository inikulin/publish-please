module.exports.isInTestMode = isInTestMode;

function isInTestMode() {
    try {
        if (
            process &&
            process.env &&
            process.env.PUBLISH_PLEASE_TEST_MODE === 'true'
        ) {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}
