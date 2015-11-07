var argv = require('optimist')
        .usage('Usage: $0 -mongoUrl [str] -coubCount [num] -minLikesCount [num]')
        .demand(['mongoUrl'])
        .default('coubCount', 3)
        .default('minLikesCount', 150)
        .argv,
    request = require('request'),
    _ = require('lodash'),
    mongoose = require('mongoose');

var Coub = mongoose.model('Coub', mongoose.Schema({
    permalink: String
}));

mongoose.connect(argv.mongoUrl);

var baseUrl = 'http://coub.com/api/v2/timeline/hot/',
    url = baseUrl + '?per_page=100&order_by=likes_count';

var newCoubs = [];

//Coub.remove({}, function (err) {
//    console.log('collection removed')
//});

request.get(url, function (err, response, body) {
    if (err)
        return console.error(err);

    var responseObj = JSON.parse(body);

    var coubs = _.chain(responseObj.coubs)
        .filter(function (x) {
            return x.likes_count >= argv.minLikesCount;
        })
        .sortBy('likes_count')
        .reverse()
        .map(function (coub) {
            return coub;
        })
        .value();

    filterCoubs(coubs, function (result) {
        _.forEach(result, function (item, key) {
            console.log('http://coub.com/view/' + item.permalink);
        });
    });
});

var filterCoubs = function (coubs, success) {
    if (!coubs.length || newCoubs.length >= argv.coubCount) {
        if (success)
            success(newCoubs);
        return;
    }

    var item = coubs.shift();

    Coub
        .findOne({permalink: item.permalink})
        .then(function (doc) {
            if (doc) {
                filterCoubs(coubs, success);
                return;
            }

            var coub = new Coub({permalink: item.permalink});
            coub.save(function (err) {
                if (err)
                    console.log(err);

                newCoubs.push(item);
                filterCoubs(coubs, success);
            });
        }, function (err) {
            return console.error(err);
        });
};