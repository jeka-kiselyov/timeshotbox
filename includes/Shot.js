const { Program, Command, LovaClass } = require('lovacli');

class Shot extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);

        //// Application properties
        this._dropboxSprites = params.dropboxSprites || null;

        //// DropBox properties
        this._name = params.name || null;
        this._path = params.path || null;
        this._date = params.date || null;
        this._channel = params.channel || null;
        this._channelDay = params.channelDay || null;

        //// Booleans
        this.isDownloaded = false;
        this.isDownloading = false;
        this.isSprited = false;
        this.isSpriting = false;

        this.imageMissed = false;

        //// Local properties
        this.fileName = params.fileName || params.filename || null;
	}

    get fs() {
        return this._dropboxSprites._fs;
    }

    isDateSameWith(shot) {
        return (shot._date.getTime() == this._date.getTime());
    }

	setChannelDay(channelDay) {
		this._channelDay = channelDay;
	}

	toString() {
		return this._name;
	}

	serialize(forAPI = false) {
		let obj = {
			name: this.name,
			date: this.date
		};

		if (this.isSprited) {
			obj.fileName = this.spriteFileName || this.fileName;
			obj.spriteCoordinates = this.spriteCoordinates;
		} else if (this.isDownloaded) {
			obj.fileName = this.fileName;
		}

        if (forAPI) {
            //// convert fileName to URL
            obj.fileName = '/api/channel/'+this.channel.name+'/day/'+this.channelDay.getDateString()+'/'+obj.fileName;
        }

		return obj;
	}

    deserialize(object) {
        this._name = object.name;
        this._date = new Date(object.date);

        if (object.fileName) {
            this.isDownloaded = true;
            this.fileName = object.fileName;
        }
        if (object.spriteCoordinates) {
            this.isSprited = true;
            this.spriteCoordinates = object.spriteCoordinates;
            this.fileName = object.fileName;
        }
    }

	get channelDay() {
		return this._channelDay;
	}

	get channel() {
		return this._channel;
	}

	get channelName() {
		return this._channel ? this._channel.name : null;
	}

	get name() {
		return this._name;
	}

	get path() {
		return this._path;
	}

	get date() {
		return this._date;
	}

	getDayString() {
		return this._date ? (this._date.getUTCFullYear() + '_' + (this._date.getUTCMonth()+1) + '_' + this._date.getUTCDate()) : null;
	}

	get timestamp() {
		return Math.floor(this.date.getTime() / 1000);
	}

    async tryToFixErrors() {
        let storePath = this.channelDay.getDownloadPath();

        if (this.fileName) {
            let imageExists = await this.fs.imageExists(storePath, this.fileName);
            if (!imageExists) {
                let downloadFilename = this.timestamp;
                downloadFilename = downloadFilename+'.jpg';

                let downloadImageExists = await this.fs.imageExists(storePath, downloadFilename);
                if (downloadImageExists) {
                    this.imageMissed = false;
                    this.isSprited = false;
                    this.isSpriting = false;
                    this.isDownloaded = true;
                    this.isDownloading = false;
                    this.fileName = downloadFilename;
                    this.spriteFileName = undefined;
                    this.spriteCoordinates = undefined;
                } else {
                    this.logger.debug('Image missed for: '+storePath+'/'+downloadFilename);
                    this.imageMissed = true;
                }
            } else {
                this.imageMissed = false;

                if (this.spriteCoordinates && (!this.spriteCoordinates.sWidth || !this.spriteCoordinates.sHeight)) {
                    //// there is no with or height of sprite container and we need it for the player
                    let size = await this.fs.imageSize(storePath, this.fileName);
                    if (size) {
                        this.spriteCoordinates.sWidth = size.width;
                        this.spriteCoordinates.sHeight = size.height;
                    }
                }
            }
        } else {
            if (!this.path) {
                let downloadFilename = this.timestamp;
                downloadFilename = downloadFilename+'.jpg';

                this.logger.debug('Not downloaded and no dropbox path: '+storePath+'/'+downloadFilename);
                this.imageMissed = true;
            }
        }
    }

	async downloadFromDropBox() {
        this.logger.debug('Downloading '+this.path);
        this.isDownloading = true;

        this.emit('downloading');

        let downloadResult = null;
        let tries = 0;
        let maxTries = 5;

        do {
            downloadResult = await this._dropboxSprites._dropbox.filesDownload({
                    path: this.path
                });
            tries++;
        } while ( (!downloadResult || !downloadResult.fileBinary || !downloadResult.fileBinary.length) && tries < maxTries );

        if (downloadResult && downloadResult.fileBinary) {
            // this.logger.debug(downloadResult);

            let downloadFilename = this.timestamp;
            /// @todo: check if file is already there - add suffix
            downloadFilename = downloadFilename+'.jpg';

            let storePath = this.channelDay.getDownloadPath();

            this.fs.saveImage(storePath, downloadFilename, downloadResult.fileBinary);

            this.isDownloaded = true;
            this.isDownloading = false;
            this.fileName = downloadFilename;

            this.logger.debug('Successfully downloaded '+this.path+' to '+storePath+'/'+downloadFilename);

            this.emit('downloaded');

            return true;
        } else {
            return false;
        }
	}
}

module.exports = Shot;