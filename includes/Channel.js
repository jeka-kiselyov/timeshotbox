const { Program, Command, LovaClass } = require('lovacli');

const ChannelDay = require('./ChannelDay.js');

class Channel extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);

        //// Application properties
        this._dropboxSprites = params.dropboxSprites || null;

        this._name = params.name || null;
        this._pathRegEx = params.pathRegEx || "^[\\w+/]+01\\.jpg$";

        if (this._pathRegEx) {
            this._pathRegEx = new RegExp(this._pathRegEx);
        }

        this._shots = [];
        this._channelDays = {};
	}

    get fs() {
        return this._dropboxSprites._fs;
    }

	get name() {
		return this._name;
	}

	getChannelDay(dateString) {
		if (this._channelDays[dateString]) {
			return this._channelDays[dateString];
		} else {
			return null;
		}
	}

	getAPIResponse() {
		let ret = [];
		for (const [key, channelDay] of Object.entries(this._channelDays)) {
			ret.push(channelDay.getDateString());
		}
		return ret;
	}

	getDownloadPath() {
		return this._name + '/';
	}

	hookChannelDayEvents(channelDay) {
		channelDay.on('shot', (shot)=>{
			this.emit('shot', shot);
		});
		channelDay.on('shotSprited', (shot)=>{
			this.emit('shotSprited', shot);
		});
	}

	async scanForDays() {
		return await this.fs.scanForChannelDays(this.getDownloadPath());
	}

	async persist() {
		let data = [];
		for (const [key, channelDay] of Object.entries(this._channelDays)) {
			data.push(channelDay.getDateString());
		}

		this.fs.persistChannelData(this.getDownloadPath(), data);
	}

	async load(loadChannelDays = false, tryToFixErrors = false) {
		this.logger.debug("Loading channel "+this.name+" data...");

		let data = [];
        try {
            data = await this.fs.loadChannelData(this.getDownloadPath());
        } catch(e) {
        	this.logger.debug("Can not load channel data from "+this.getDownloadPath());
        	console.log(3);
            data = [];

            return false;
        }

        this.logger.debug("Loaded "+data.length+" days from indexes");

        if (tryToFixErrors) {
        	let c = 0;
        	let scannedDays = await this.scanForDays();
        	for (let scannedDay of scannedDays) {
        		data.push(scannedDay);
        		c++;
        	}

	        this.logger.debug("Scanned "+c+" days from storage");
        }

        //// create Shot objects
        let c = 0;
        for (let dataItem of data) {

        	let dateItems = dataItem.split('_');
        	let year = dateItems[0] ? parseInt(dateItems[0], 10) : null;
        	let month = dateItems[1] ? parseInt(dateItems[1], 10) : null;
        	let day = dateItems[2] ? parseInt(dateItems[2], 10) : null;

			if (!this._channelDays[dataItem] && year && month && day) {
				this._channelDays[dataItem] = new ChannelDay({
					dropboxSprites: this._dropboxSprites,
					channel: this,
					logger: this.logger,
					day: day,
					month: month,
					year: year
				});
				this.hookChannelDayEvents(this._channelDays[dataItem]);

				if (loadChannelDays) {
					c = c + await this._channelDays[dataItem].load(tryToFixErrors);
				}
			}
        }

        this.logger.debug("Loaded "+c+" shots to the channel");

        if (tryToFixErrors) {
        	await this.persist();
        }

        return true;
	}


	isPathBelong(path) {
		if (this._pathRegEx.test(path)) {
			return true;
		}

		return false;
	}

	hasShot(toBeFoundShot) {
		/// @todo: optimize - search in channelDays
		// console.log(toBeFoundShot._date);

		for (let shot of this._shots) {
			if (shot.isDateSameWith(toBeFoundShot)) {
				// console.log('true');
				return true;
			}
		}

		// for (let shot of this._shots) {
		// 	console.log(shot._date);
		// 	if (shot.isDateSameWith(toBeFoundShot)) {
		// 		console.log('true');
		// 		return true;
		// 	}
		// }
		// 		console.log('false');

		return false;
	}

	async addShot(shot, addToChannelDays = true) {
		this._shots.push(shot);

		if (addToChannelDays) {
			if (!this._channelDays[shot.getDayString()]) {
				/// if it's new ChannelDay - make sprites for all previous days
				// we can't as we are downloading async now in different order
				// this.makeSpritesForAllPreviousDays();

				this._channelDays[shot.getDayString()] = new ChannelDay({
					dropboxSprites: this._dropboxSprites,
					channel: this,
					logger: this.logger,
					date: shot.date
				});
				this.hookChannelDayEvents(this._channelDays[shot.getDayString()]);

				await this.persist();

				await this._channelDays[shot.getDayString()].load();
			}

			this._channelDays[shot.getDayString()].addShot(shot);
			shot.setChannelDay(this._channelDays[shot.getDayString()]);			
		}
	}

	async makeSpritesForAllPreviousDays() {
		for (const [key, channelDay] of Object.entries(this._channelDays)) {
			await channelDay.spriteEverything();
		}		
	}

	checkIfShotsAreReadyToBeSprited() {
		for (const [key, channelDay] of Object.entries(this._channelDays)) {
			channelDay.checkIfShotsAreReadyToBeSprited();
		}
	}
}

module.exports = Channel;