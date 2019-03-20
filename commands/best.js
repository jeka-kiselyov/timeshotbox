const { Program, Command } = require('lovacli');
const LocalFS = require('../includes/fs/LocalFS.js');
const path = require('path');

class Handler extends Command {
    async setup(progCommand) {
        progCommand.description('vodochka');
    }

    get description() {
        return 'Some nice description';
    }

    async handle(args, options, logger) {
        let fs = new LocalFS({
            path: path.join(__dirname, '../sprites/')
        });
        let size = await fs.imageSize('CH1/2018/2018_10_27', '1540590267-1540651007.jpg');
        console.log(size);

        this.program.exit();
    }
};

module.exports = Handler;