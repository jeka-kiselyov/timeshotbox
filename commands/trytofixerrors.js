const { Program, Command } = require('lovacli');

const DropboxSprites = require('../includes/DropboxSprites.js');

class Handler extends Command {
    async setup(progCommand) {
        progCommand.description('Try to fix errors on broken local data');
    }

    async description() {
        return 'Try to fix errors in stored channel days data';
    }

    async handle(args, options, logger) {
        let ds = new DropboxSprites({
            logger: logger
        });

        let channels = await ds.loadChannels(true, true);
        for (let channel of channels) {
            await channel.makeSpritesForAllPreviousDays();
        }

        this.program.exit();
    }
};

module.exports = Handler;