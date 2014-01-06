module.exports = process.env.TEST_COVERAGE ? require('./lib-cov/view') : require('./lib/view');
