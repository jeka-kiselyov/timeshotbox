const { Program, Command, LovaClass } = require('lovacli');
const restify = require('restify');
const path = require('path');
const fs = require('fs');
const webpack = require("webpack");
const errs = require('restify-errors');
const crypto = require('crypto');
const restifyCookies = require('restify-cookies');

class Server extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);
        this._server = null;
        this._logger = params.logger || null;
        this._ds = params.ds || null;

        this._events = [];

        this._outData = {
            index: {
                content: null,
                fileName: path.join(__dirname, '../frontend/index.html'),
                contentType: 'text/html',
                livereload: true
            },
            favicon: {
                content: null,
                fileName: path.join(__dirname, '../frontend/favicon.ico'),
                contentType: 'image/x-icon'
            },
            robotstxt: {
                content: null,
                fileName: path.join(__dirname, '../frontend/robots.txt'),
                contentType: 'text/plain'
            },
            indexjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/index.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            }
        };

        this._credentials = params.credentials || [];
        if (!Array.isArray(this._credentials)) {
            this._credentials = [this._credentials];
        }

        ///// very simple and rude security hack - we ask server for random nonce before each signin and use it as salf for password hashing
        ///// that's why, in theory, we will have random hash sending over http each time
        this._authNonces = [];

        ///// we store auth results here.
        this._authCodes = [];


        this._checkAuthIP = params.checkAuthIP;   /// restrict authCodes to work from same IP they were created from
        this._maxAuthCodeAge = params.maxAuthCodeAge; /// restrict authCode age to seconds

        this._port = params.port || 8080;

        this._enableLivereload = params.enableLivereload || false;
        this._enableWebpackWatch = params.enableWebpackWatch || false;
        this._enableWebpackBuild = params.enableWebpackBuild || false;
	}

    log(str) {
        if (this._logger) {
            this._logger.debug(str);
        } else {
            console.log(str);
        }
    }

    async init() {
        let promise = new Promise((resolve, reject)=>{
            this.log('Creating server instance...');
            this._server = restify.createServer({
                strictFormatters: false
            });

            this._server.pre(restify.plugins.pre.dedupeSlashes());
            this._server.pre(restify.pre.sanitizePath());
            this._server.use(restify.plugins.bodyParser({
                    mapParams: true,
                    maxBodySize: 10240 /// 10kb is enough for username + password. Increase if you need this for custom methods
                }));
            this._server.use(restifyCookies.parse);


            this._server.get('/', this.asyncWrap(this.index));
            this._server.get('/favicon.ico', this.asyncWrap(this.favicon));
            this._server.get('/index.js', this.asyncWrap(this.indexjs));
            this._server.get('/robots.txt', this.asyncWrap(this.robotstxt));

            this._server.post('/api/authNonce', this.asyncWrap(this.authNonce));
            this._server.post('/api/auth', this.asyncWrap(this.auth));

            //// longpoll (comet) returning events
            this._server.post('/api/events', this.asyncWrap(this.events));
            this._server.get('/api/events', this.asyncWrap(this.events));

            this._server.get('/api/channel/:channel', this.asyncWrap(this.channel, true));
            this._server.get('/api/channel/:channel/day/:day', this.asyncWrap(this.channelDay, true));
            this._server.get('/api/channel/:channel/day/:day/:filename', this.asyncWrap(this.channelDayFile, true));

            this._server.listen(this._port, ()=>{
                this.log(this._server.name+' listening at '+this._server.url);
                resolve(true);
            });
        });

        await promise;
        await this.initLivereload();
    }

    async initLivereload() {
        if (!this._enableLivereload) {
            return false;
        }

        let pathes = [];

        for (const [key, outData] of Object.entries(this._outData)) {
            if (outData.livereload) {
                let fileName = outData.compiledFileName || outData.fileName || null;
                if (fileName) {
                    pathes.push(fileName);
                }
            }
        }

        if (pathes) {
            this.log("Setting up LiveReload server to watch on "+pathes.length+" pathes...");

            try {
                const livereload = require('livereload');
                const server = livereload.createServer();
                server.on('error', ()=>{
                    this.log("Error initializing LiveReload server");                    
                });
                server.watch(pathes);
            } catch(e) {
                this.log("Error initializing LiveReload server");
            }
        }
    }

    addEvent(data) {
        let eventObject = {
            data: data,
            date: new Date()
        };

        this._events.push(eventObject);
        this._events = this._events.slice(-1000); /// keep 1000 most recent events in memory
    }

    async events(req, res) {
        let maxTimeout = 60000; /// in ms
        let lookForEventsInterval = 1000; // in ms
        let from = req.params.from;
        let fromDate = from ? new Date(from) : new Date();
        if (!(fromDate instanceof Date && !isNaN(fromDate))) {
            fromDate = new Date();
        }

        let startTime = new Date();
        let currentTime = new Date();
        let results = [];
        do {
            await new Promise(resolve => setTimeout(resolve, lookForEventsInterval));
            for (let event of this._events) {
                if (event.date > fromDate) {
                    results.push(event);
                }
            }
            currentTime = new Date();
        } while(!results.length && (currentTime.getTime() - startTime.getTime() < maxTimeout));

        if (results.length) {
            res.send({
                events: results
            });
        } else {
            res.send({
                events: []
            });
        }
    }

    asyncWrap(fn, checkAuth) {
        return (function(req, res, next) {
            this.log('Server request: '+req.href());

            let authCheckPromise = null;
            if (checkAuth) {
                authCheckPromise = new Promise((resolve, reject)=>{
                    let authCode = req.cookies.authCode || null;
                    for (let auth of this._authCodes) {
                        if (auth.authCode == authCode) {
                            if (this._checkAuthIP) {
                                if (auth.ip != req.connection.remoteAddress) {
                                    return resolve(false);
                                }
                            }
                            if (this._checkAuthDate) {
                                let now = new Date();
                                if (!auth.date || ( Math.abs(now.getTime() - auth.date.getTime()) > this._maxAuthCodeAge * 1000 ) ) {
                                    return resolve(false);
                                }
                            }
                            return resolve(true);
                        }
                    }
                    resolve(false);
                });
            } else {
                authCheckPromise = Promise.resolve(true);
            }

            authCheckPromise.then((authSuccess)=>{
                if (!authSuccess) {
                    throw new errs.UnauthorizedError("Can you please auth first?");
                }

                return fn.call(this, req, res);
            }).then(function(results){
                next();
            }).catch(function(err){
                return next(err);
            });


            // fn.call(this, req, res).catch(function(err) {
            //     return next(err);
            // }).then(function(results) {
            //     next();
            // });          
        }).bind(this);
    }

    async authNonce(req, res) {
        let randomNonce = crypto.randomBytes(128).toString('hex');
        this._authNonces.push(randomNonce);
        if (this._authNonces.length > 10) {
            /// store up to 10 last nonces. We are targeting simple tool apps here, so no more than 10 parallel 
            /// signin are more than enough
            this._authNonces = this._authNonces.slice(-10);
        }

        res.send({
            nonce: randomNonce
        });
    }

    async auth(req, res) {
        let ret = {
            success: false,
            authCode: null
        };

        let username = req.params.username;
        let passwordHash = req.params.password;

        let hashIsGood = false;
        for (let i = 0; i < this._authNonces.length; i++) {
            let nonce = this._authNonces[i];

            for (let credentials of this._credentials) {
                if (username == credentials.username) {
                    let hash = crypto.createHash('md5').update(''+nonce+''+credentials.password).digest("hex");
                    if (hash == passwordHash) {
                        hashIsGood = true;
                        /// remove this nonce from authNonces. To be sure we use it once only
                        this._authNonces.splice(i, 1);
                    }                           
                }         
            }
        }

        if (hashIsGood) {
            ret.success = true;
            let authCode = crypto.randomBytes(128).toString('hex');
            ret.authCode = authCode;

            this._authCodes.push({
                authCode: authCode,
                ip: req.connection.remoteAddress,
                date: new Date()
            });

            if (this._authCodes.length > 10) {
                let now = new Date();

                //// we are cleaning authCodes that are outdated
                for (let i = 0; i < this._authCodes.length; i++) {
                    let auth = this._authCodes[i];
                    if (now.getTime() - auth.date.getTime() > this._maxAuthCodeAge*1000) {
                        this._authCodes.splice(i, 1);
                        i--; /// keep index on the next item even though it's moved, without this, we'd skip one item in the loop
                    }
                }

                //// just limit the total count to 1000 to be sure we are not eating too much memory
                this._authCodes = this._authCodes.slice(-1000);
            }

            let authCookieOptions = {
            };

            if (this._maxAuthCodeAge) {
                authCookieOptions.maxAge = this._maxAuthCodeAge;
            }

            res.setCookie('authCode', authCode, authCookieOptions);   
        }

        if (!ret.success) {
            res.status(401); 
            res.send(ret);
        } else {
            res.send(ret);            
        }
    }

    async getOutData(name) {
        if (this._outData[name] && this._outData[name].content !== null) {
            return this._outData[name];
        }

        try {
            if (this._outData[name].webpack && !this._enableWebpackBuild) {
                /// if we are not using webpack - use already compiled code
                this._outData[name].fileName = this._outData[name].compiledFileName;
            }

            if (this._outData[name].webpack && this._enableWebpackBuild) {
                this.log("Compiling "+this._outData[name].fileName+" with webpack...");

                let compilerOptions = require(path.join(__dirname, '../frontend/webpack.config.js'));
                let compiler = webpack(compilerOptions);
                
                let promise = new Promise((resolve, reject)=>{
                    compiler.run((err, stats) => {
                        if (err) {
                            return reject(err);
                        }
                        this._outData[name].hash = stats.hash || null;

                        resolve(true);
                    });
                });

                try {
                    await promise;
                    this.log("Compiled to "+this._outData[name].compiledFileName);
                    this._outData[name].content = fs.readFileSync(this._outData[name].compiledFileName);
                } catch(e) {
                    this.log(e);
                    this._outData[name].content = null;
                }  


                if (this._outData[name].watch && this._enableWebpackWatch) {
                    const watching = compiler.watch({
                            // Example watchOptions
                            aggregateTimeout: 300,
                            poll: undefined
                        }, (err, stats) => {
                            if (stats && stats.hash && stats.hash != this._outData[name].hash) {
                                this._outData[name].hash = stats.hash;
                                this.log("Webpack sources for "+name+" have been changed");
                                this._outData[name].content = null;
                            }
                        });                    
                }
            } else {
                this.log("Reading content from "+this._outData[name].fileName+"  ...");
                if (this._outData[name].livereload) {
                    /// do not cache files for livereload. This is the quick hack for index.html
                    let content = fs.readFileSync(this._outData[name].fileName);
                    let obj = Object.assign({}, this._outData[name]);
                    obj.content = content;
                    return obj;
                } else {
                    this._outData[name].content = fs.readFileSync(this._outData[name].fileName);                        
                }            
            }
        } catch(e) {
            this.log(e);
            this._outData[name].content = null;
        }

        return this._outData[name];
    }

    async channelDayFile(req, res) {
        let channelName = req.params.channel || null;
        let channel = this._ds.getChannelByName(channelName);
        if (channel) {
            let channelDayDateString = req.params.day || null;
            let channelDay = channel.getChannelDay(channelDayDateString);

            if (channelDay) {
                let channelDayDayFileName = req.params.filename || null;  

                let image = null;
                try {
                    image = await channelDay.getImage(channelDayDayFileName, true);
                } catch(e) {
                    console.log(e);
                }

                if (image) {
                    if (image.stream) {
                        res.setHeader('content-type', 'image/jpeg');
                        try {
                            image.stream.on('error', function(){
                                res.status(404); 
                                res.end();
                            });
                            image.stream.pipe(res);
                        } catch(e) {
                            throw new errs.NotFoundError('Not found image');  
                        }                          
                    } else {
                        /// @todo: implement redirects here
                    }
                } else {
                    throw new errs.NotFoundError('Not found image');  
                }        
            } else {
                throw new errs.NotFoundError('Invalid channel day');                 
            }
        } else {
            throw new errs.NotFoundError('Invalid channel name'); 
        }
    }

    async channelDay(req, res) {
        let channelName = req.params.channel || null;
        let channel = this._ds.getChannelByName(channelName);
        if (channel) {
            let channelDayDateString = req.params.day || null;
            let channelDay = channel.getChannelDay(channelDayDateString);

            if (channelDay) {
                res.send(channelDay.getAPIResponse());                
            } else {
                throw new errs.NotFoundError('Invalid channel day');                 
            }
        } else {
            throw new errs.NotFoundError('Invalid channel name'); 
        }
    }

    async channel(req, res) {
        let channelName = req.params.channel || null;
        let channel = this._ds.getChannelByName(channelName);
        if (channel) {
            res.send(channel.getAPIResponse());
        } else {
            throw new errs.NotFoundError('Invalid channel name'); 
        }
    }

    async index(req, res) {
        let outData = await this.getOutData('index');
        res.setHeader('content-type', outData.contentType);
        res.send(outData.content);
    }

    async indexjs(req, res) {
        let outData = await this.getOutData('indexjs');
        res.setHeader('content-type', outData.contentType);
        res.send(outData.content);
    }

    async robotstxt(req, res) {
        let outData = await this.getOutData('robotstxt');
        res.setHeader('content-type', outData.contentType);
        res.send(outData.content);
    }

    async favicon(req, res) {
        let outData = await this.getOutData('favicon');
        res.setHeader('content-type', outData.contentType);
        res.send(outData.content);
    }
}

module.exports = Server;