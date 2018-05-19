module.exports = {
    validations: require('./validations').DEFAULT_OPTIONS,

    confirm: true,
    publishCommand: 'npm publish',
    publishTag: 'latest',
    prePublishScript: 'npm test',
    postPublishScript: '',
};
