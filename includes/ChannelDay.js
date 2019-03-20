const { Program, Command, LovaClass } = require('lovacli');

const Spritesmith = require('spritesmith');

const Shot = require('./Shot.js');

class ChannelDay extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);

        //// Application properties
        this._dropboxSprites = params.dropboxSprites || null;
        this._channel = params.channel || null;

        this._shots = [];

        this._day = params.day || null;     /// 1-31
        this._month = params.month || null; /// 1-12
        this._year = params.year || null;   /// 2067

        if (params.date) {
			this._day = params.date.getUTCDate();
			this._month = params.date.getUTCMonth() + 1;
			this._year = params.date.getUTCFullYear();        	
        }

        this._maxShotsPerSprite = 100;
        this._minShotsPerSprite = 5;
	}

    get fs() {
        return this._dropboxSprites._fs;
    }

	get channel() {
		return this._channel;
	}

	getAPIResponse() {
		let ret = [];
		for (const [key, shot] of Object.entries(this._shots)) {
			ret.push(shot.serialize(true));
		}
		return ret;
	}

	getDateString() {
		return '' + this._year + '_' + this._month + '_' + this._day;
	}

	getDownloadPath() {
		return this._channel.getDownloadPath() + this._year + '/' + this.getDateString() + '/';
	}

	async getImage(fileName, stream = false) {
		return await this.fs.getImage(this.getDownloadPath(), fileName, stream);
	}

	addShot(shot) {
		if (!this._day || !this._month || !this._year) {
			//// take date from shot
			this._day = shot.date.getUTCDate();
			this._month = shot.date.getUTCMonth() + 1;
			this._year = shot.date.getUTCFullYear();
		} else {
			if (shot.date.getUTCDate() != this._day || (shot.date.getUTCMonth() + 1) != this._month || shot.date.getUTCFullYear() != this._year) {
				throw new Error('Shots in ChannelDay should be from the same day');
			}
		}

		this._shots.push(shot);
		shot.once('downloaded', ()=>{ 
			this.checkIfShotsAreReadyToBeSprited(); 
			this.persist();

			this.emit('shot', shot);
		});
	}

	async persist() {
		let data = [];
		for (let shot of this._shots) {
			data.push(shot.serialize());
		}

		this.fs.persistDayData(this.getDownloadPath(), data);
	}

	async load(tryToFixChannelDaysErrors = false) {
		let data = [];
        try {
            data = await this.fs.loadDayData(this.getDownloadPath());
        } catch(e) {
        	this.logger.debug("Can not load channelDay data from "+this.getDownloadPath());
            data = [];

            return false;
        }

        //// create Shot objects
        let c = 0;
        for (let dataItem of data) {
        	let shot = new Shot({
        		channelDay: this,
        		channel: this.channel,
        		dropboxSprites: this._dropboxSprites,
                logger: this.logger
        	});
        	shot.deserialize(dataItem);

        	if (tryToFixChannelDaysErrors) {
        		await shot.tryToFixErrors();
        		if (!shot.imageMissed) {
		        	this._shots.push(shot);
		        	this.channel.addShot(shot, false);  

		        	c++;       			
        		}
        		await this.persist();
        	} else {
	        	this._shots.push(shot);
	        	this.channel.addShot(shot, false);    
	        	c++;    		
        	}
        }

        return c;
	}

	async sprite(shots, removeProcessedFiles = true) {
		let fileNames = [];
		let absoluteFileNames = [];

		let minTimestamp = Infinity;
		let maxTimestamp = -Infinity;

		for (let shot of shots) {
			shot.isSpriting = true;
			fileNames.push(shot.fileName);
			absoluteFileNames.push(this.fs.path + this.getDownloadPath() + shot.fileName);

			if (shot.timestamp > maxTimestamp) {
				maxTimestamp = shot.timestamp;
			}
			if (shot.timestamp < minTimestamp) {
				minTimestamp = shot.timestamp;
			}
		}

		this.logger.debug('Creating sprite out of '+shots.length+' shots');

		let promise = new Promise((resolve, reject)=>{
			Spritesmith.run({src: absoluteFileNames, engine: require('gmsmith'), exportOpts: {format: 'jpg', quality: 60}}, function handleResult (err, result) {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}

				// result.image; // Buffer representation of image
				// result.coordinates; // Object mapping filename to {x, y, width, height} of image
				// result.properties; // Object with metadata about spritesheet {width, height}
			});
		});


		let result = null;
		try {
			result = await promise;
		} catch(e) {
			this.logger.error(e);
			return false;
		}

		let spriteFileName = minTimestamp + '-' + maxTimestamp + '.jpg';

		let success = false;

        try {
        	if (result.image && result.image.length) {
				this.logger.debug('Saving result to '+spriteFileName);
				this.fs.saveImage(this.getDownloadPath(), spriteFileName, result.image);
	            success = true;        		
        	}
        } catch(e) {
            this.logger.error(e);
            success = false;
        }

        let spritesFileDimensions = null;
        if (success) {
        	spritesFileDimensions = await this.fs.imageSize(this.getDownloadPath(), spriteFileName);
        	if (!spritesFileDimensions) {
        		success = false;
        	}
        }

        if (success) {
			for (let shot of shots) {
				for (const [key, coordinates] of Object.entries(result.coordinates)) {
					if ((''+key).indexOf(shot.fileName) != -1) {
						shot.spriteCoordinates = coordinates;
						shot.spriteCoordinates.sWidth = spritesFileDimensions.width;
						shot.spriteCoordinates.sHeight = spritesFileDimensions.height;
					}
				}
				shot.isSpriting = false;
				shot.isSprited = true;

				this.emit('shotSprited', shot);

				shot.spriteFileName = spriteFileName;
			}
			
			this.persist();

			if (removeProcessedFiles) {
				for (let fileName of fileNames) {
					this.logger.debug('Removing already processed file: '+fileName);
					this.fs.removeImage(this.getDownloadPath(), fileName);
				}
			}

			this.emit('sprited');        	
        }

		return true;
	}

	async spriteEverything() {
		let batches = [];
		let j = 0;
		let batch = [];
		do {
			let shot = this._shots[j];
			if (shot.isDownloaded && !shot.isSprited && !shot.isSpriting) {
				batch.push(shot);
			}
			if (batch.length == this._maxShotsPerSprite) {
				batches.push(batch);
				batch = [];
			}
			j++;
		} while(j < this._shots.length);

		if (batch.length) {
			batches.push(batch);
		}

		for (let toBeSprited of batches) {
			if (toBeSprited.length >= this._minShotsPerSprite) {
				await this.sprite(toBeSprited);				
			}
		}
	}

	checkIfShotsAreReadyToBeSprited() {
		let downloadedAndNotSpritedCount = 0;
		let toBeSprited = [];
		for (let shot of this._shots) {
			if (shot.isDownloaded && !shot.isSprited && !shot.isSpriting) {
				downloadedAndNotSpritedCount++;
				toBeSprited.push(shot);
			}
		}

		if (downloadedAndNotSpritedCount >= this._maxShotsPerSprite) {
			this.sprite(toBeSprited);
		}
	}
}

module.exports = ChannelDay;