module.exports = {
    validations: require('./validations').DEFAULT_OPTIONS,

    confirm:          true,
    publishTag:       'latest',
    prePublishScript: 'npm test'
};
