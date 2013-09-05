#!/usr/bin/env node
var spawn = require('child_process').spawn,
	async = require('async'),
	googleapis = require('googleapis'),
	FTPClient = require('ftp'),
	fs = require('fs'),
	libxmljs = require('libxmljs'),
	pd = require('pretty-data').pd,
	moment = require('moment'),
	$ = require('jquery'),
	argv = require('optimist')
    .usage('Downloads a YouTube video and rips it to MP3.\nUsage: $0 -c [channel] -v [title]')
    .alias('f', 'config')
    .alias('c', 'channel')
    .alias('v', 'video')
    .describe('f', 'Config File')
    .describe('c', 'YouTube Channel Name')
    .describe('v', 'YouTube Video Title')
    .argv;	
	


/**
 *  Define the sample application.
 */
var AllApp = function() {
	
	'use strict';
	
	var that = this;

	var videoFilename, mp3Filename;
	var xmlDoc;
	var conn = {};
	
	/*
	 * Configuration file describing RSS details
	 */
	var config = {};

    var remoteMp3Filename;


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    this.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('UpdateRss3App stopped.');
    };
    
    
    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    this.setupTerminationHandlers = function() {
        //  Process on exit and signals.
        process.on('exit', function() {
			console.log ('exit event - calling terminator()');
			that.terminator();
		});

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() {
				that.terminator(element); });
			});
    };

	function trim (str) {
		return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}

	this.searchForYouTubeChannel = function (callback) {
		if (argv.c) {
			console.log ('Searching YouTube for the channel : ' + argv.c);
			
			var findYouTubeChannelReq={}, findYouTubeVideoReq={};
			
			googleapis
			    .discover('youtube', 'v3')
			    .execute(function(err, client) {
				
				findYouTubeChannelReq = client.youtube.search.list({
					key: config.podcasts.gapiKey,
					part: 'id',
					maxResults: 1,
					q : argv.c,
					type: 'channel'
				});
				
				findYouTubeChannelReq.execute(function (err, response) {
					
					findYouTubeVideoReq = client.youtube.search.list({
						key: config.gapiKey,
						part: 'snippet',
						maxResults: 1,
						channelId: response.items[0].id.channelId,
						order: 'date',
						type: 'video'
					});
					
					findYouTubeVideoReq.execute(function (err, response) {
						that.videoId = response.items[0].id.videoId;
						that.videoTitle = response.items[0].snippet.title;
						that.description = response.items[0].snippet.description;
						console.log ('Latest video from ' + argv.c + ' is "' + that.videoTitle + '"');
						callback (null, 'searchForYouTubeChannel');
					});
				});
			});		
		} else {
			callback (null, 'searchForYouTubeChannel - skipped');
		}
	};



	this.searchForYouTubeVideo = function (callback) {
		if (argv.c) {
			callback (null, 'searchForYouTubeVideo - skipped');
		} else if (argv.v) {
			console.log ('Searching YouTube for the video: ' + argv.v);
			
			var findYouTubeVideoReq={};
			
			googleapis
			    .discover('youtube', 'v3')
			    .execute(function(err, client) {
				
				findYouTubeVideoReq = client.youtube.search.list({
					key: config.podcasts.gapiKey,
					part: 'snippet',
					maxResults: 1,
					q: argv.v,
					type: 'video'
				});
					
				findYouTubeVideoReq.execute(function (err, response) {
					that.videoId = response.items[0].id.videoId;
					that.videoTitle = response.items[0].snippet.title;
					that.description = response.items[0].snippet.description;
					console.log ('Found video : "' + that.videoTitle + '"');
					callback (null, 'searchForYouTubeVideo');
				});
			});		
		} else {
			callback (null, 'searchForYouTubeVideo skipped');
		}			
	};


	/**
	 *
	 */
	this.convertToMp3 = function(callback) {
		if (argv.c || argv.v) {
			that.mp3Filename = that.videoFilename.replace(/\.[^\.]+$/, '.mp3');
			that.remoteMp3Filename = that.mp3Filename.replace(/ /g,"_");
			
			if (!fs.existsSync(that.mp3Filename)) {
				console.log ('Ripping "' + that.videoFilename + '" to "' + that.mp3Filename + '"');

				var process = spawn('avconv', ['-i', that.videoFilename, that.mp3Filename]);

				process.stdout.once('data', function (data) {
					console.log('stdout: ' + data);
				});

				process.stderr.once('data', function (data) {
					console.log('stderr: ' + data);
				});

				process.on('close', function (code) {
					console.log('child process exited with code ' + code);
					if (code === 0) {
						callback (null, 'convertToMp3');
					} else {
						callback (code, 'convertToMp3');
					}
				});
			} else {
				console.log (that.mp3Filename + ' already downloaded!');
				callback (null, 'convertToMp3 skipped');
			}
		} else {
			callback (null, 'convertToMp3 skipped');
		}
	};
	
	
	/**
	 *
	 */
	this.downloadYouTube = function(callback) {
		if (argv.c || argv.v) {
			var replacement = ' ';

			that.videoFilename = trim(that.videoTitle.replace(/[|&;:$%@#"<>()+,?\/]/g, replacement)) + '.webm';
			
			if (!fs.existsSync(that.videoFilename)) {
				console.log ('Downloading "' + that.videoTitle + '" to "' + that.videoFilename + '"');
				var process = spawn('/home/rob/build/inst/bin/cclive', ['https://www.youtube.com/watch?v=' + that.videoId, '--output-file', that.videoFilename, '-W']);

				process.stdout.on('data', function (data) {
					console.log('stdout: ' + data);
				});

				process.stderr.once('data', function (data) {
					console.log('stderr: ' + data);
				});

				process.on('close', function (code) {
					console.log('child process exited with code ' + code);
					if (code === 0) {
						callback (null, 'downloadYouTube');
					} else {
						callback (code, 'downloadYouTube');
					}
				});
			} else {
				console.log (that.videoFilename + ' already downloaded!');
				callback (null, 'downloadYouTube skipped');
			}
		} else {
			callback (null, 'downloadYouTube skipped');
		}
		
	};
	

	/**
	 *
	 */
	this.connect = function(callback) {
	    console.log('Connecting to ' + config.podcasts.hostname);
		that.conn = new FTPClient();

		that.conn.on('ready', function() {
			callback(null, 'connect');
		});

		that.conn.on('greeting', function(message) {
			console.log(message);
		});

		that.conn.on('close', function(hadErr) {
			if (hadErr) {
				console.log ('hadErr - ' + hadErr);
			}
		});

		that.conn.on('end', function() {
			console.log ('end');
		});

		that.conn.on('error', function(err) {
			console.log ('error');
			callback(err, 'connect');
		});
			
		that.conn.connect({
			host: config.podcasts.hostname,
			user: config.podcasts.username,
			password: config.podcasts.password
			});
	};	
	
	/**
	 *
	 */
	this.close = function(callback) {
	    console.log('Closing connection to ' + config.podcasts.hostname);
	    that.conn.end();
	    that.conn.destroy();
		callback(null, 'close');
    };
    
    

	/**
	 *
	 */
	this.downloadToLocalRss = function(callback) {
	    console.log('Downloading ' + config.podcasts.remoteRssFile);
	    
		that.conn.get(config.podcasts.remoteRssFile, function(err, stream) {
			if (err) {
				throw err;
			}

			stream.once('close', function() {
				console.log ('Downloaded ' + config.podcasts.remoteRssFile + ' to ' + config.podcasts.localRssfile);
				callback(null, 'downloadToLocalRss');
			});
			
			stream.pipe(fs.createWriteStream(config.podcasts.localRssfile));
		});
	};
	
	

	this.loadLocalRss = function(callback) {
		fs.readFile(__dirname + '/rss.xml', 'utf8', function(err, data) {
			that.xmlDoc = libxmljs.parseXml(data);
			callback (null, 'loadLocalRss');
		});		
	};		

    
	this.modify = function(callback) {
		var channel = that.xmlDoc.get('//channel');
		
		that.addNewItemToChannel(channel);
		
		callback(null, 'modify');
	};

	
	this.addNewItemToChannel = function(channel) {
//		that.videoTitle = 'Taxes   Smuggling - Prelude to Revolution  Crash Course US History #6';
//		that.description = "In which John Green teaches you about the roots of the American Revolution. The Revolution did not start on July 4, 1776. The Revolutionary War didn't start on July 4 either. (as you remember, I'm sure, the Revolution and the Revolutionary War are not the same thing) The shooting started on April 19, 1775, at Lexington and/or Concord, MA. Or the shooting started with the Boston Massacre on March 5, 1770. At least we can pin down the Declaration of Independence to July 4, 1776. Except that most of the signers didn't sign until August 2. The point is that the beginning of the Revolution is very complex and hard to pin down. John will lead you through the bramble of taxes, royal decrees, acts of parliament, colonial responses, and various congresses. We'll start with the end of the Seven Years War, and the bill that the British ran up fighting the war. This led to taxes on colonial trade, which led to colonists demanding representation, which led to revolution. It all seems very complicated, but Crash Course will get you through it in about 12 minutes.";
//		that.mp3Filename = 'Taxes   Smuggling - Prelude to Revolution  Crash Course US History #6.mp3';
//		that.videoId = 'Eytc9ZaNWyc';
		
		var existingItem = that.xmlDoc.get('//item/title="' + that.videoTitle + '"');
		if (!existingItem) {
			console.log ('Adding new rss item for "' + that.videoTitle + '"');
			
			var newItemElem = libxmljs.Element(channel.doc(), 'item');
			
			var url = config.podcasts.urlOfPodcasts + that.remoteMp3Filename; 
			
			var titleElem = newItemElem.node('title', that.videoTitle);
			var linkElem = newItemElem.node('link', 'https://www.youtube.com/watch?v=' + that.videoId);
			var guidElem = newItemElem.node('guid', 'https://www.youtube.com/watch?v=' + that.videoId);
			var descriptionElem = newItemElem.node('description', that.description);
			var enclosureElem = newItemElem.node('enclosure', enclosureElem);
			var urlAttr = enclosureElem.attr('url', url);
			var lengthAttr = enclosureElem.attr('length', '1');
			var typeAttr = enclosureElem.attr('type', 'audio/mpeg');
			var pubDateElem = newItemElem.node('pubDate', moment().format('ddd, DD MMM YYYY HH:mm:ss') + ' GMT');
			
			var firstItem = that.xmlDoc.get('//item[1]');	
			console.log (firstItem);
			firstItem.addPrevSibling(newItemElem);
		} else {
			console.log ('Item already exists in rss file for "' + that.videoTitle + '"');
		}
	};
		
	this.saveLocalRss = function (callback) {
		var prettyXml = pd.xml(that.xmlDoc.toString());

		fs.writeFile(__dirname + '/rss.xml', prettyXml, function(err) {
			callback(err, 'saveLocalRss');
		});
	};		
	
	/**
	 *
	 */
	this.uploadRss = function(callback) {
	    console.log('Uploading ' + config.podcasts.localRssfile);
		that.conn.put(fs.createReadStream(config.podcasts.localRssfile), config.podcasts.remoteRssFile, function (err) {
			if (err) {
				throw err;
			}
			callback(null, 'uploadRss');
		});
	};
	
	/**
	 *
	 */
	this.uploadMp3 = function(callback) {
	    console.log('Uploading ' + that.mp3Filename);
		that.conn.put(fs.createReadStream('./' + that.mp3Filename), '/www/podcasts/rob/' + that.remoteMp3Filename, function (err) {
			if (err) {
				throw err;
			}
			callback(null, 'uploadMp3');
		});
	};
	
	
	this.readConfig = function(callback) {
		var stream = fs.createReadStream(argv.config);

		var lines = '';

		stream.on('data', function (buf) {
		    lines += buf;
		});

		stream.on('end', function () {
			config = $.parseJSON(lines);
			callback(null, 'readConfig');
		});	
	};
	
	
	
	this.start = function() {
		async.series([
			this.readConfig,
			this.searchForYouTubeChannel,
			this.searchForYouTubeVideo,
		    this.downloadYouTube,
		    this.convertToMp3,
		    this.connect,
		    this.downloadToLocalRss,
		    this.close,
			this.loadLocalRss,
		    this.modify,
		    this.saveLocalRss,
		    this.connect,
		    this.uploadRss,
		    this.uploadMp3,
		    this.close
		],
		function(err, results){
			if (err) {
				console.log('Errors encountered - ' + err);
			}
			
			console.log(results);
		});
	};

	
	this.initialize = function() {
		this.setupTerminationHandlers();
	};
    
};   /*  AllApp Application.  */


/**
 *  main():  Main code.
 */
var app = new AllApp();
app.initialize();
app.start();
