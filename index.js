var REQ = require('./dist/eee');

module.exports = REQ.default;

for (var n in REQ) {
    if (n !== 'default') {
        module.exports[n] = REQ[n]
    }
}
