const { Program, Command } = require('lovacli');

const DropboxSprites = require('../includes/DropboxSprites.js');

class Handler extends Command {
    setup(progCommand) {
        progCommand.description('vodochka');
    }

    async description() {
        return 'testasdfsdf';
    }

    async handle(args, options, logger) {
        let ds = new DropboxSprites({
            logger: logger
        });
        let channels = await ds.loadChannels(true, false);

        await ds.getMostRecent();
        this.program.exit();
    }
};

module.exports = Handler;