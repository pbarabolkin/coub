var argv = require('optimist')
        .usage('Usage: $0 -mongoUrl [str] -coubsUrl [str] -coubCount [num] -minLikesCount [num] -resetCoubsHisrory [bool]')
        .demand(['mongoUrl'])
        .default('coubsUrl', 'http://coub.com/api/v2/timeline/hot?per_page=100&order_by=likes_count')
        .default('coubCount', 10)
        .default('minLikesCount', 200)
        .default('resetCoubsHisrory', false)
        .argv,
    Q = require('q'),
    request = require('request-promise'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    open = require('open');

var Coub = mongoose.model('Coub', mongoose.Schema({
    permalink: String
}));

mongoose.connect(argv.mongoUrl);

if (argv.resetCoubsHisrory) {
    Coub.remove({}, function (err) {
        console.log('Cobe history removed');
    });
}

var fetchCoubs = function (url) {
    return request(url)
        .then(function (response) {
            var responseObj = JSON.parse(response);

            return _.chain(responseObj.coubs)
                .filter(function (x) {
                    return x.likes_count >= argv.minLikesCount;
                })
                .sortBy('likes_count')
                .reverse()
                .map(function (coub) {
                    return coub;
                })
                .value();
        })
        .catch(function (error) {
            console.error(error);
            return [];
        });
};

var filterCoubs = function (coubs) {
    var filterCoubsInternal = function (coubs, deferred, resultCoubs) {
        resultCoubs = resultCoubs || [];

        if (!coubs.length || resultCoubs.length >= argv.coubCount) {
            return deferred.resolve(resultCoubs);
        }

        var item = coubs.shift();

        Coub
            .findOne({permalink: item.permalink})
            .then(function (doc) {
                if (doc) {
                    filterCoubsInternal(coubs, deferred, resultCoubs);
                    return;
                }

                var coub = new Coub({permalink: item.permalink});
                coub.save(function (err) {
                    if (err)
                        console.log(err);

                    resultCoubs.push(item);
                    filterCoubsInternal(coubs, deferred, resultCoubs);
                });
            }, function (err) {
                return console.error(err);
            });
    };

    var deferred = Q.defer();
    filterCoubsInternal(coubs, deferred);

    return deferred.promise;
};

var processCoubs = function (coubsUrl) {
    return fetchCoubs(coubsUrl)
        .then(filterCoubs)
        .then(function (result) {
            _.forEach(result, function (item, key) {
                console.log('http://coub.com/view/' + item.permalink);
            });

            return result;
        });
};

processCoubs(argv.coubsUrl)
    .then(function (coubs) {
        _.forEach(coubs, function (item) {
            open('http://coub.com/view/' + item.permalink);
        });

        console.log('Done');
    })
    .catch(function (error) {
        console.error(error);
    });