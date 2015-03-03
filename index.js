var request = require('request'),
	xml2js = require('xml2js'),
	Q = require('q'),
	parser = new xml2js.Parser(),
	originalRequest;

var KICKASS_URL = 'http://kickassunblock.net/';

//searching for the torrent
var getSearchRSS = function(searchString, callback) {
	var requestURL = KICKASS_URL + 'usearch/' + searchString,
		deferred = Q.defer();

	request(requestURL, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			deferred.resolve(body);
		} else {
			deferred.reject(new Error('File not found'));
		}
	});

	return deferred.promise.nodeify(callback);
}

//just parsing the search response
var parseRSS = function(rawBody, callback) {
	var deferred = Q.defer();

	parser.parseString(rawBody, function(err, result) {
		if (!err) {
			deferred.resolve(result);
		} else {
			deferred.reject(new Error('Couldn\'t parse response'));
		}
	});

	return deferred.promise.nodeify(callback);
}

//get the parsed rss, sort by seeds and get the best.
var findBestTorrent = function(data, callback) {
	var torrentList = data.rss.channel[0].item,
		torrent,
		deferred = Q.defer(),
		torrents = [];

	torrentList.sort(function(a, b) {
		return b['torrent:seeds'] - a['torrent:seeds'];
	});

	for(var i = 0; i < originalRequest.limit; i++) {

		if(!torrentList[i]) break;

		torrent = {
			name: originalRequest.name,
			torrentData: {
				title: torrentList[i].title[0],
				seeds: torrentList[i]['torrent:seeds'][0],
				fileName: torrentList[i]['torrent:fileName'][0].slice(0, torrentList[i]['torrent:fileName'][0].length - 8),
				torrent: torrentList[i].enclosure[0].$.url,
				magnetURI: torrentList[i]['torrent:magnetURI'][0],
				fileSize: torrentList[i].enclosure[0].$.length
			}
		}

		torrents.push(torrent)
	}

	deferred.resolve(torrents);
	return deferred.promise.nodeify(callback);

}


//util function to clean show name in case it brings weird characters
var cleanName = function(name) {
	var newName = name.replace(/\([0-9]{4}\)/g, '');
	newName = newName.replace(/[\']/g, '');
	newName = newName.replace(/[\(\)\:\!\?\,\.]/g, ' ');
	newName = newName.replace(/&/g, 'and');

	return newName;
};

var getTorrent = function(options, callback) {
	var	name = cleanName(options.name),
		deferred = Q.defer(),
		minSeeds = 100,
		limit = 10;

	if(options.url) KICKASS_URL = options.url;

	if(options.seeds) minSeeds = options.seeds;

	if(options.limit) limit = options.limit;


	var searchString = name + ' seeds:'+ minSeeds+' verified:1/?rss=1';

	originalRequest = {
		name: options.name,
		limit: limit,
		seeds: options.seeds,
		verified: options.verified
	}

	deferred.resolve(searchString);
	return deferred.promise.nodeify(callback);

}


module.exports = function(options, callback) {
	var deferred = Q.defer();

	var promise = getTorrent(options);
	promise.then(getSearchRSS)
		.then(parseRSS)
		.then(findBestTorrent)
		.then(function(finalData) {
			deferred.resolve(finalData);
		})
		.
	catch (function(error) {
		deferred.reject(error);
	});
	return deferred.promise.nodeify(callback);
}
