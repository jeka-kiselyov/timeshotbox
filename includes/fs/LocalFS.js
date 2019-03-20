
const path = require('path');
const fs = require('fs');
const gm = require('gm');

class LocalFS {
    constructor(params = {}) {
    	this._path = params.path || null;
    	this._path = this.beSureThereIsTrailingSlash(this._path);
	}

	get path() {
		return this._path;
	}

	beSureThereIsTrailingSlash(path) {
		return (path.substr(-1) == '/' ? path : path+'/');
	}

	beSurePathExists(subpath) {
		this.mkDirByPathSync(this._path + subpath);
	}

	async scanForChannelDays(subpath) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
		let days = [];
		let toplevel = fs.readdirSync(this._path + subpath);
		for (let tl of toplevel) {
			try {
				let dayslevel = fs.readdirSync(this._path + subpath + tl);

				for (let dayslevelitem of dayslevel) {
		        	let dateItems = dayslevelitem.split('_');
		        	let year = dateItems[0] ? parseInt(dateItems[0], 10) : null;
		        	let month = dateItems[1] ? parseInt(dateItems[1], 10) : null;
		        	let day = dateItems[2] ? parseInt(dateItems[2], 10) : null;

		        	if (year && month && day) {
		        		days.push(dayslevelitem);
		        	}
				}
			} catch(e) {

			}
		}

		return days;
	}

	async persistChannelData(subpath, data) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
        try {
        	this.beSurePathExists(subpath);
            fs.writeFileSync(this._path + subpath + 'index.json', JSON.stringify(data, null, 4));
            return true;
        } catch(e) {
            console.log(e);
            return false;
        }		
	}

	async loadChannelData(subpath) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
        try {
        	this.beSurePathExists(subpath);
            let data = fs.readFileSync(this._path + subpath + 'index.json', {encoding: 'UTF-8'});
            data = JSON.parse(data);

            return data;
        } catch(e) {
            // console.log(e);

            return [];
        }		
	}

	async persistDayData(subpath, data) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
        try {
        	this.beSurePathExists(subpath);
            fs.writeFileSync(this._path + subpath + 'index.json', JSON.stringify(data, null, 4));
            return true;
        } catch(e) {
            console.log(e);
            return false;
        }
	}

	async loadDayData(subpath) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
        try {

        	this.beSurePathExists(subpath);
            let data = fs.readFileSync(this._path + subpath + 'index.json', {encoding: 'UTF-8'});
            data = JSON.parse(data);

            return data;
        } catch(e) {
            // console.log(e);

            return [];
        }		
	}

	async getImage(subpath, fileName, stream = false) {
		if (this.imageExists(subpath, fileName)) {
			if (stream) {
				return {
					stream: fs.createReadStream(this._path + subpath + fileName),
					redirect: false
				};
			} else {
				return {
					content: fs.readFileSync(this._path + subpath + fileName),
					redirect: false
				};				
			}
		} else {
			return null;
		}
	}

	async imageSize(subpath, fileName) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
		let promise = new Promise((resolve, reject)=>{
            gm(this._path + subpath + fileName)
            .size(function (err, size) {
            	if (err) {
            		return resolve(null);
            	}
            	return resolve(size);
            });
		});

		return await promise;
	}

	async imageExists(subpath, fileName) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
		if (fs.existsSync(this._path + subpath + fileName)) {
			return true;
		}

		return false;
	}

	async saveImage(subpath, fileName, binaryOrData) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
        try {
        	this.beSurePathExists(subpath);
            fs.writeFileSync(this._path + subpath + fileName, binaryOrData);
	        return true;
        } catch(e) {
        	console.log(e);
        	return false;
        }
	}

	async removeImage(subpath, fileName) {
		subpath = this.beSureThereIsTrailingSlash(subpath);
		try {
			fs.unlinkSync(this._path + subpath + fileName);
			return true;
		} catch(e) {
        	console.log(e);
			return false;
		}
	}

	/**
	 * Recursive dir creation. THanks to @Mouneer : https://stackoverflow.com/a/40686853/1119169
	 * @param  {[type]} targetDir                  [description]
	 * @param  {[type]} options.isRelativeToScript [description]
	 * @return {[type]}                            [description]
	 */
	mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
		const sep = path.sep;
		const initDir = path.isAbsolute(targetDir) ? sep : '';
		const baseDir = isRelativeToScript ? __dirname : '.';

		return targetDir.split(sep).reduce((parentDir, childDir) => {
			const curDir = path.resolve(baseDir, parentDir, childDir);
			try {
				fs.mkdirSync(curDir);
			} catch (err) {
				if (err.code === 'EEXIST') { // curDir already exists!
					return curDir;
				}

				// To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
				if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
					throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
				}

				const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
				if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
					throw err; // Throw if it's just the last created dir.
				}
			}

			return curDir;
		}, initDir);
	}
}

module.exports = LocalFS;

