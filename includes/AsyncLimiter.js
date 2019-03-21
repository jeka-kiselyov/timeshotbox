const { Program, Command, LovaClass } = require('lovacli');

class AsyncLimiter extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);
	}

    static setMaxJobs(id, count) {
        AsyncLimiter.defaults();
        AsyncLimiter.__maxJobs[id] = count;  
    }

    static defaults() {
        if (!AsyncLimiter.__activeJobs) {
            AsyncLimiter.__activeJobs = {};
        }
        if (!AsyncLimiter.__waitingJobs) {
            AsyncLimiter.__waitingJobs = {};
        }
        if (!AsyncLimiter.__maxJobs) {
            AsyncLimiter.__maxJobs = {};
        }
    }

    static async start(id) {
        AsyncLimiter.defaults();

        if (!AsyncLimiter.__maxJobs[id]) {
            return true;
        }

        if (!AsyncLimiter.__activeJobs[id]) {
            AsyncLimiter.__activeJobs[id] = 0;
        }

        if (!AsyncLimiter.__waitingJobs[id]) {
            AsyncLimiter.__waitingJobs[id] = 0;
        }

        console.log(''+id+' - '+AsyncLimiter.__activeJobs[id]);

        if (AsyncLimiter.__activeJobs[id] >= AsyncLimiter.__maxJobs[id]) {
            console.log('Waiting for the async limit.... '+id);
            //// wait till they are completed
            AsyncLimiter.__waitingJobs[id]++;
            do {
                await new Promise(resolve => setTimeout(resolve, 50));
            } while(AsyncLimiter.__activeJobs[id] >= AsyncLimiter.__maxJobs[id]);
            AsyncLimiter.__waitingJobs[id]--;
        }

        AsyncLimiter.__activeJobs[id]++;
        return true;
    }

    static async end(id) {
        AsyncLimiter.defaults();
        AsyncLimiter.__activeJobs[id]--;
    }

    static async waitForEmpty(id) {
        AsyncLimiter.defaults();

        if (!AsyncLimiter.__maxJobs[id]) {
            return true;
        }

        if (!AsyncLimiter.__activeJobs[id]) {
            AsyncLimiter.__activeJobs[id] = 0;
        }

        if (!AsyncLimiter.__waitingJobs[id]) {
            AsyncLimiter.__waitingJobs[id] = 0;
        }

        do {
            await new Promise(resolve => setTimeout(resolve, 50));
        } while(AsyncLimiter.__activeJobs[id] != 0 || AsyncLimiter.__waitingJobs[id] != 0);
    }
}

module.exports = AsyncLimiter;