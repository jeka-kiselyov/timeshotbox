<template>
	<div id="app">
		<auth v-if="!isAuthenticated" @authenticated="authenticated" ref="auth"></auth>
		<div v-if="isAuthenticated">
			<div class="sidebar_container">
				<sidebar ref="sidebar" v-bind:height="sizes.screen.height"></sidebar>
			</div>
			<div class="monitor_container">
				<screen ref="screen"  v-bind:width="sizes.screen.width" v-bind:height="sizes.screen.height"></screen>
			</div>
			<controls ref="controls" v-bind:width="sizes.controls.width" v-bind:timeframes="timeframes"></controls>
		</div>
	</div>
</template>
<script>
import './components/';

export default {
	data: function(){
		return {
			timeframes: [],
			isAuthenticated: false,
			authCode: null,
			message: 'Hello Vue!',
			date: new Date(2019, 0, 1, 23, 0, 0, 0),
			sizes: {
				screen: {
					width: 0,
					height: 0
				},
				controls: {
					width: 0,
					height: 0
				}
			}
		}
	},
	created: function(){
		// this.play();

	},
	mounted: function() {
		this.registerRisizeEvent();
	},
	methods: {
		longPoll: function() {
			this._lastLongPollDate = new Date();
			this._lastLongPollDate.setSeconds(this._lastLongPollDate.getSeconds() - 1); /// rude way to cover pings

			axios.post('/api/events', {from: this._lastLongPollDate}).
				then((response)=>{
					if (response && response.data && response.data.events) {
						if (response.data.events.length) {
							this.$refs.screen.handleEvents(response.data.events);
						}
					} else {
						throw new Error("");
					}
				}).finally(()=>{
					setTimeout(()=>{
						this.longPoll();
					}, 500);
				});
		},
		initChilds: function() {
			this.$refs.controls.$on('date', (date)=>{
				this.setDate(date);
			});
			this.$refs.controls.$on('play', ()=>{
				this.play();
			});
			this.$refs.controls.$on('pause', ()=>{
				this.pause();
			});
			this.$refs.sidebar.$on('mode',(mode)=>{
				this.$refs.screen.setMode(mode);
			});
			this.$refs.screen.$on('daysDone',()=>{
				this.$refs.controls.setDaysWithData(this.$refs.screen.getDaysWithData());
				this.restoreLastDate();
			});
			this.$refs.screen.$on('dayDone',()=>{
				this.setDate();
			});

			this.recalculateWidth();
			this.longPoll();
		},
		authenticated: function(authCode) {
			this.isAuthenticated = true;
			this.authCode = authCode;

			this.$nextTick(()=>{
				this.initChilds();
			});
		},
		registerRisizeEvent: function() {
			(function() {
				var throttle = function(type, name, obj) {
					obj = obj || window;
					var running = false;
					var func = function() {
						if (running) { return; }
						running = true;
						requestAnimationFrame(function() {
							obj.dispatchEvent(new CustomEvent(name));
							running = false;
						});
					};
					obj.addEventListener(type, func);
				};

				/* init - you can init any event */
				throttle("resize", "optimizedResize");
			})();

	        window.addEventListener('optimizedResize', this.recalculateWidth);
		},
		recalculateWidth: function() {
			let size = {
				width: document.documentElement.clientWidth,
				height: document.documentElement.clientHeight
			};

			this.sizes.screen.width = size.width - 150;
			this.sizes.screen.height = size.height - 150;

			this.sizes.controls.height = 150;
			this.sizes.controls.width = size.width;

			this.$refs.controls.resizeTo(this.sizes.controls.width, 150);
			this.$refs.screen.resizeTo(this.sizes.screen.width, this.sizes.screen.height);
			this.$refs.sidebar.resizeTo(this.sizes.screen.width, this.sizes.screen.height);
		},
		hasShotsInTheFuture: function() {
			return this.$refs.screen.hasShotsInTheFuture();
		},
		setDate: function(date) {
			if (date) {
				this.date = date;				
			}

			console.log('Set: '+date);

			// for (let children of this.$children) {
			// 	children.setDate(date);
			this.$refs.screen.setDate(this.date);

			let from = new Date(this.date.getTime());
			let to =  new Date(this.date.getTime());

			from.setHours(0,0,0);
			to.setHours(23,59,59);

			from.setTime(from.getTime() - 2*60*60*1000);
			to.setTime(to.getTime() + 2*60*60*1000);

			this.$refs.controls.setFromTo(from, to);
			// this.$refs.controls.setTimeframes(this.$refs.screen.getTimeframes(from, to));
			this.$refs.controls.setCurrentTime(this.date);

			this.timeframes = this.$refs.screen.getTimeframes(from, to);

			if (date) {
				this.persistLastDate();
			}
		},
		persistLastDate: function() {
			if (this.date) {
				let lastTimestamp = this.date.getTime();
				document.cookie = "lastPlayingDate="+lastTimestamp;
				return true;
			} else {
				return false;
			}
		},
		restoreLastDate: function() {
			let lastTimestamp = document.cookie.replace(/(?:(?:^|.*;\s*)lastPlayingDate\s*\=\s*([^;]*).*$)|^.*$/, "$1");
			if (!lastTimestamp) {
				this.setDate(new Date());

				return null;
			}
			lastTimestamp = parseInt(lastTimestamp, 10);
			if (lastTimestamp && lastTimestamp > 0) {
				let date = new Date(lastTimestamp);
				this.setDate(date);

				// console.log(date);

				return date;
			} else {
				this.setDate(new Date());
				
				return null;
			}
		},
		play: function() {
			this._playingInterval = setInterval(()=>{
				this.doPlaying();
			}, 200);
		},
		pause: function() {
			clearInterval(this._playingInterval);
		},
		doPlaying() {
			setTimeout(()=>{
				if (!this.hasShotsInTheFuture()) {
					return false;
				}
				
				let timeDiff = this.$refs.screen.getDiffBetweenShots() || 5*60000;
				let shift = timeDiff / 5;
				let nextDate = new Date(this.date.getTime() + shift);
				let nextShotTime = this.$refs.screen.getNextShotTime();

				if (nextShotTime) {
					//// little fix to be sure we are not missing short timeframes going right after long ones
					if (this.date < nextShotTime && nextDate > nextShotTime) {
						this.date = new Date(nextShotTime.getTime() + 1); /// just a tiny shift to future
					} else {
						this.date = nextDate;
					}
				} else {
					this.date = nextDate;
				}

				this.setDate(this.date);
			}, 200);

		}
	}
}
</script>
<style>
	#app {
		position: fixed; 
		overflow: hidden;
		top: 0; right: 0; bottom: 0; left: 0; 
	}	
	.sidebar_container {
		position: absolute;
		top: 0;
		left: 0;
		width: 150px;
	}
	.monitor_container {
		margin-left: 150px;
	}

	button {
		-moz-box-shadow:inset 0px 1px 0px 0px #ffffff;
		-webkit-box-shadow:inset 0px 1px 0px 0px #ffffff;
		box-shadow:inset 0px 1px 0px 0px #ffffff;
		background-color:#ffffff;
		-moz-border-radius:1px;
		-webkit-border-radius:1px;
		border-radius:1px;
		border:1px solid #dcdcdc;
		display:inline-block;
		cursor:pointer;
		color:#666666;
		font-family:Arial;
		font-size:15px;
		padding:6px 24px;
		text-decoration:none;
		text-shadow:0px 1px 0px #ffffff;
	}
	button:hover {
		background-color:#f6f6f6;
	}

	input[type=text], input[type=password] {
		-moz-box-shadow:inset 0px 1px 0px 0px #ffffff;
		-webkit-box-shadow:inset 0px 1px 0px 0px #ffffff;
		box-shadow:inset 0px 1px 0px 0px #ffffff;
		background-color:#ffffff;
		-moz-border-radius:1px;
		-webkit-border-radius:1px;
		border-radius:1px;
		border:1px solid #dcdcdc;
	    box-sizing: border-box;
	    width: 100%;
		padding: 10px;

	}

</style>