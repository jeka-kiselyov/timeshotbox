const { Program, Command } = require('lovacli');

const DropboxSprites = require('../includes/DropboxSprites.js');

class Handler extends Command {
    setup(progCommand) {
        progCommand.argument('[app]', 'App to deploy');
        progCommand.argument('[app2]', 'App to deploy');
        progCommand.argument('[app3]', 'App to deploy');
        progCommand.option('--vodochka <lines>', 'Tail <lines> lines of logs after deploy', this.prog.INT);
        // return this.prog.command('test', 'Test');
    }

    async description() {
        return 'testasdfsdf';
    }

    async handle(args, options, logger) {
        // let db = await this.db.init();
        // this.logger.info(db);
        // 
        
        // console.log(args);
        console.log(options);

        let ds = new DropboxSprites({
            logger: logger
        });
        let channels = await ds.loadChannels(true, false);

        await ds.getFreshFiles();
        await ds.removeOldFoldersFromDropBox();

        for (let i = 0; i < 100; i++) {
            await ds.longPollForChanges();
            await ds.lsAndCacheContinue();
        }

        this.program.exit();
    }
};

module.exports = Handler;