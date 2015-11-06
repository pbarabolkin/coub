var argv = require('optimist').argv,
    request = require('request'),
    _ = require('lodash');

if (!argv.coubCount)
    return console.error('"coubCount" parameter is required');

var baseUrl = 'http://coub.com/api/v2/timeline/hot/',
    url = baseUrl + '?&order_by=likes_count';

request.get(url, function (err, response, body) {
    if (err)
        return console.error(err);

    var responseObj = JSON.parse(body);

    var result = _.chain(responseObj.coubs)
        .sortBy('likes_count')
        .reverse()
        .take(argv.coubCount)
        .map(function (coub) {
            return coub;
        })
        .value();

    _.forEach(result, function (item, key) {
        console.log('http://coub.com/view/' + item.permalink);
        //console.log(n, key);
    });
    //console.log(body);
});