var katsearcher = require('./index.js');
var Q = require('q');

katsearcher({
    name: 'taken',
    limit: 10
}).then(function(finalData) {
        console.log(finalData);
    })
    .
catch (function(error) {
    console.log(error);
});