const { Program, Command, LovaClass } = require('lovacli');
const Dropbox = require('dropbox').Dropbox;
const fetch = require('isomorphic-fetch');

const util = require('util');

const Shot = require('./Shot.js');
const Channel = require('./Channel.js');

const path = require('path');
const LocalFS = require('./fs/LocalFS.js');

class DropboxSprites extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params) {
        super(params);

        this._dropbox = null;
        this._isInitialized = false;
        this._mostRecentDropboxCursor = null;

        this._files = [];
        this._filesToDownload = [];
        this._filesDownloaded = [];

        this._mostRecentEventFilesI = 0;

        this._fs = new LocalFS({
            path: path.join(__dirname, '../sprites/')
        });

        let channelData = params.channels || [];
        this._channels = [];
        for (let channelDataItem of channelData) {
            this._channels.push(
                new Channel({
                    name: channelDataItem.name,
                    pathRegEx: channelDataItem.pathRegEx,
                    dropboxSprites: this,
                    logger: this.logger
                })
            );
        }

        this.hookChannelEvents();

        this._rootPath = params.rootPath || "/dvr/videomotion";

        this._dropboxPathes = {};

        this._removeFolderIfThereIsNoFileNewerThanXDays = params.removeFolderIfThereIsNoFileNewerThanXDays || Infinity;
        this._removeFolderRegex = params.removeFolderRegex || null;

        if (this._removeFolderRegex) {
            this._removeFolderRegex = new RegExp(this._removeFolderRegex);
        }

        this._accessToken = params.accessToken || null;
        this._longPollTimeout = params.longPollTimeout || 60;
    }

    hookChannelEvents() {
        for (let channel of this._channels) {
            channel.on('shot', (shot)=>{
                this.emit('shot', shot);
            });
            channel.on('shotSprited', (shot)=>{
                this.emit('shotSprited', shot);
            });
        }
    }

    getChannelByName(name) {
        for (let channel of this._channels) {
            if (channel.name == name) {
                return channel;
            }
        }

        return null;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadChannels(loadChannelDays = false, tryToFixChannelDaysErrors = false) {
        for (let channel of this._channels) {
            await channel.load(loadChannelDays, tryToFixChannelDaysErrors);
        }

        return this._channels;
    }

    async initializeDropbox() {
        if (this._isInitialized) {
            return true;
        }

        this._dropbox = new Dropbox({ accessToken: this._accessToken, fetch: fetch });
        this._isInitialized = true;

        return true;
    }

    async getFreshFiles() {
        await this.initializeDropbox();
        await this.lsAndCache(this._rootPath);
    }

    async longPollForChanges() {
        let thereReMore = false;
        let longPollTimeout = this._longPollTimeout;
        do {
            let resp = null;
            try {
                this.logger.debug("Querying DropBox longpoll for changes...");
                resp = await this._dropbox.filesListFolderLongpoll({cursor: this._mostRecentDropboxCursor, timeout: longPollTimeout});
            } catch(e) {
                console.log(e);
                resp = {changes: false, backoff: 0};
            }
            this.logger.debug("Got response. Changes: "+( (resp && resp.changes) ? 'true' : 'false'));

            if (resp && resp.backoff) {
                this.logger.debug("Backoff for: "+resp.backoff+" seconds");
                // If present, backoff for at least this many seconds before calling list_folder/longpoll again.
                await this.sleep(resp.backoff * 1000);
            }
            if (resp && resp.changes) {
                thereReMore  = true;
            }
        } while(!thereReMore);

        return thereReMore;
    }

    async removeOldFoldersFromDropBox() {
        this.logger.debug('Removing folders older than '+this._removeFolderIfThereIsNoFileNewerThanXDays+' days from DropBox...');
        let now = new Date();

        if (this._removeFolderIfThereIsNoFileNewerThanXDay == Infinity || this._removeFolderIfThereIsNoFileNewerThanXDay == false) {
            this.logger.debug('Switched off by settings');            
        } 

        for (const [path, pathModifiedDate] of Object.entries(this._dropboxPathes)) {
            let timeDiff = Infinity;
            if (pathModifiedDate && pathModifiedDate.getTime()) {
                timeDiff = Math.abs(now.getTime() - pathModifiedDate.getTime());
            }
            let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 

            if (diffDays > this._removeFolderIfThereIsNoFileNewerThanXDays) {
                this.logger.debug('Removing old folder '+path);
                let r = await this._dropbox.filesDeleteV2({path: path});
            }
        }
    }

    async lsAndCacheContinue() {
        return await this.lsAndCache(null, this._mostRecentDropboxCursor);
    }

    async lsAndCache(path, cursor) {
        let mostRecentEntryDate = null;

        let resp = {};
        if (cursor) {
            this.logger.debug("Querying DropBox using cursor...");
            resp = await this._dropbox.filesListFolderContinue({cursor: cursor});
        } else {
            this.logger.debug("Querying DropBox using path...");
            resp = await this._dropbox.filesListFolder({path: path, recursive: true});
        }
        
        // let resp = await this._dropbox.filesListFolder({path: path, recursive: true});

        this.logger.debug("Response from DropBox: " + ( (resp && resp.entries && resp.entries.length) ? resp.entries.length + ' entries' : 'no entries'));

        if (resp && resp.entries && resp.entries.length) {
            for (let entry of resp.entries) {
                if (entry && entry['.tag'] == 'folder' && entry.path_lower) {
                    if (!this._dropboxPathes[entry.path_lower] && (!this._removeFolderRegex || this._removeFolderRegex.test(entry.path_lower))) {
                        this.logger.debug("Discovered new path on DropBox: "+entry.path_lower);
                        this._dropboxPathes[entry.path_lower] = 0;
                    }

                    // let lowerDirMostRecentDate = await this.lsAndCache(entry.path_lower);
                    // if (lowerDirMostRecentDate && lowerDirMostRecentDate > mostRecentEntryDate) {
                    //     mostRecentEntryDate = lowerDirMostRecentDate;
                    // }

                    // if (lowerDirMostRecentDate && (!this._removeFolderRegex || this._removeFolderRegex.test(entry.path_lower))) {
                    //     //// if folder is too old - remove it after processing
                    //     let now = new Date();
                    //     let timeDiff = Math.abs(now.getTime() - lowerDirMostRecentDate.getTime());
                    //     let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 

                    //     if (diffDays > this._removeFolderIfThereIsNoFileNewerThanXDays) {
                    //         this.logger.debug('Removing old folder '+entry.path_lower);
                    //         let r = await this._dropbox.filesDeleteV2({path: entry.path_lower});
                    //     }
                    // }

                    // this.logger.debug('Dir '+entry.path_lower+' date: '+lowerDirMostRecentDate);
                } else if (entry && entry['.tag'] == 'file') {
                    let date = new Date(entry.server_modified);

                    for (const [path, pathModifiedDate] of Object.entries(this._dropboxPathes)) {
                        if (entry.path_lower.indexOf(path) === 0) {
                            if (date > pathModifiedDate) {
                                this._dropboxPathes[path] = date;
                            }                            
                        }
                    }

                    for (let channel of this._channels) {
                        if (channel.isPathBelong(entry.path_lower)) {
                            let shot = new Shot({
                                name: entry.name,
                                path: entry.path_lower,
                                date: date,
                                channel: channel,
                                channelName: channel.name,
                                dropboxSprites: this,
                                logger: this.logger
                            });

                            if (!channel.hasShot(shot)) {
                                await channel.addShot(shot);
                                shot.downloadFromDropBox();
                                this._files.push(shot);                                
                            }

                        }
                    }
                }
            }

            this.emitEventsForNewFiles();
        }

        if (resp && resp.cursor) {
            this._mostRecentDropboxCursor = resp.cursor;
            if (resp.has_more) {
                await this.lsAndCache(null, resp.cursor);                
            }
        }

        return mostRecentEntryDate;
    }

    async emitEventsForNewFiles() {
        let portion = this._files.slice(this._mostRecentEventFilesI);

        if (portion.length) {
            this.emit('files', portion);            
        }

        /// @todo: also emit filtered by tags
        this._mostRecentEventFilesI = this._files.length;
    }
};

module.exports = DropboxSprites;