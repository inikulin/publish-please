module.exports = [
    require('./check-uncommitted'),
    require('./check-untracked'),
    require('./sensitive-data-audit'),
    require('./validate-branch'),
    require('./validate-git-tag')
];
