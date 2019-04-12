const { Program, Command } = require('lovacli');

const DropboxSprites = require('../includes/DropboxSprites.js');
const Server = require('../includes/Server.js');
const AsyncLimiter = require('../includes/AsyncLimiter.js');

class Handler extends Command {
    setup(progCommand) {
        progCommand.description('Sync with dropbox and start local server');
    }

    async handle(args, options, logger) {
        let settings = {};
        try {
            settings = require('../settings/settings.js');
        } catch(e) {
            logger.error("Can not load settings from settings/settings.js");
            settings = {};
        };

        let dropboxOptions = settings.dropbox || {};
        dropboxOptions.logger = logger;

        let ds = new DropboxSprites(dropboxOptions);
        await ds.loadChannels(true, false);


        let serverOptions = settings.server || {};
        serverOptions.logger = logger;
        serverOptions.ds = ds;

        let server = new Server(serverOptions);
        
        ds.on('shot', (shot)=>{
            let eventData = shot.serialize(true);
            eventData.channel = shot.channel.name;
            server.addEvent(eventData);
        });
        ds.on('shotSprited', (shot)=>{
            let eventData = shot.serialize(true);
            eventData.channel = shot.channel.name;
            server.addEvent(eventData);
        });

        
        await server.init();

        await ds.getFreshFiles();
        await AsyncLimiter.waitForEmpty('download');
        await ds.makeSpritesForAllPreviousDays();
        await ds.removeOldFoldersFromDropBox();

        do {
            await ds.longPollForChanges();
            await ds.lsAndCacheContinue();
        } while(true);


        // this.program.exit();
    }
};

module.exports = Handler;