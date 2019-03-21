<template>
	<div class="screen" v-bind:style="{ width: computedWidth, height: computedHeight }">
		<monitor ref="monitor1" channel="CH1" v-bind:width="sizes.ch1.width" v-bind:height="sizes.ch1.height"></monitor>
		<monitor ref="monitor2" channel="CH2" v-bind:width="sizes.ch2.width" v-bind:height="sizes.ch2.height"></monitor>
		<monitor ref="monitor3" channel="CH3" v-bind:width="sizes.ch3.width" v-bind:height="sizes.ch3.height"></monitor>
		<monitor ref="monitor4" channel="CH4" v-bind:width="sizes.ch4.width" v-bind:height="sizes.ch4.height"></monitor>
	</div>
</template>
<script>
import _ from 'lodash';

export default {
	data () {
		return {
			mode: 0,
			width: 200,
			height: 200,
			sizes: {
				ch1: {
					width: 100,
					height: 100
				},
				ch2: {
					width: 100,
					height: 100
				},
				ch3: {
					width: 100,
					height: 100
				},
				ch4: {
					width: 100,
					height: 100
				}
			},
			offsets: {
				ch1: {
					x: 0,
					y: 0
				},
				ch2: {
					x: 0,
					y: 0
				},
				ch3: {
					x: 0,
					y: 0
				},
				ch4: {
					x: 0,
					y: 0
				}
			}
		};
	},
	computed: {
		computedWidth: function() {
			return ''+this.width+'px';
	    },
		computedHeight: function() {
			return ''+this.height+'px';
	    }
	},
	created: function() {
		this._date = null;
	},
	mounted: function() {
		let debouncedDDdaysHandler = _.debounce(()=>{
			this.$emit('daysDone');
		}, 500);

		this.$refs.monitor1.$on('daysDone', debouncedDDdaysHandler);
		this.$refs.monitor2.$on('daysDone', debouncedDDdaysHandler);
		this.$refs.monitor3.$on('daysDone', debouncedDDdaysHandler);
		this.$refs.monitor4.$on('daysDone', debouncedDDdaysHandler);

		let debouncedDDayHandler = _.debounce(()=>{
			this.$emit('dayDone');
		}, 500);

		this.$refs.monitor1.$on('dayDone', debouncedDDayHandler);
		this.$refs.monitor2.$on('dayDone', debouncedDDayHandler);
		this.$refs.monitor3.$on('dayDone', debouncedDDayHandler);
		this.$refs.monitor4.$on('dayDone', debouncedDDayHandler);

		this.$refs.monitor1.$on('click', () => { this.clickMonitor(1); });
		this.$refs.monitor2.$on('click', () => { this.clickMonitor(2); });
		this.$refs.monitor3.$on('click', () => { this.clickMonitor(3); });
		this.$refs.monitor4.$on('click', () => { this.clickMonitor(4); });
	},
	watch: {
		height: function() {

		}
	},
	methods: {
		hasShotsInTheFuture: function() {
			for (let i = 1; i <= 4; i++) {
				if (this.$refs['monitor'+i].hasShotsInTheFuture()) {
					return true;
				}
			}

			return false;
		},
		handleEvents: function(eventsArray) {
			for (let event of eventsArray) {
				if (event.data) {
					if (event.data.channel == 'CH1') {
						this.$refs.monitor1.handleEvent(event.data);
					}
					if (event.data.channel == 'CH2') {
						this.$refs.monitor2.handleEvent(event.data);
					}
					if (event.data.channel == 'CH3') {
						this.$refs.monitor3.handleEvent(event.data);
					}
					if (event.data.channel == 'CH4') {
						this.$refs.monitor4.handleEvent(event.data);
					}					
				}
			}
		},
		getDaysWithData: function() {
			let ret = [];
			ret = ret.concat(this.$refs.monitor1.getDaysWithData(), this.$refs.monitor2.getDaysWithData(), this.$refs.monitor3.getDaysWithData(), this.$refs.monitor4.getDaysWithData());
			ret = ret.filter((v, i, a) => a.indexOf(v) === i); /// get unique
			return ret;
		},
		setDate: function(date) {
			this._date = date;

			this.$refs.monitor1.setDate(date);
			this.$refs.monitor2.setDate(date);
			this.$refs.monitor3.setDate(date);
			this.$refs.monitor4.setDate(date);
		},
		getDiffBetweenShots() {
			return Math.min(this.$refs.monitor1._diffBetweenShots, 
				this.$refs.monitor2._diffBetweenShots, 
				this.$refs.monitor3._diffBetweenShots, 
				this.$refs.monitor4._diffBetweenShots);
		},
		getNextShotTime: function() {
			let nextShotTime = null;
			if (!nextShotTime || this.$refs.monitor1.getNextShotTime() < nextShotTime) {
				nextShotTime = this.$refs.monitor1.getNextShotTime();
			}
			if (!nextShotTime || this.$refs.monitor2.getNextShotTime() < nextShotTime) {
				nextShotTime = this.$refs.monitor2.getNextShotTime();
			}
			if (!nextShotTime || this.$refs.monitor3.getNextShotTime() < nextShotTime) {
				nextShotTime = this.$refs.monitor3.getNextShotTime();
			}
			if (!nextShotTime || this.$refs.monitor4.getNextShotTime() < nextShotTime) {
				nextShotTime = this.$refs.monitor4.getNextShotTime();
			}

			return nextShotTime;
		},
		getTimeframes: function(from, to) {
			return [
					this.$refs.monitor1.getTimeframes(from, to),
					this.$refs.monitor2.getTimeframes(from, to),
					this.$refs.monitor3.getTimeframes(from, to),
					this.$refs.monitor4.getTimeframes(from, to)
				];
		},
		resizeTo: function(width, height) {
			if (width && height) {
				this.width = width;
				this.height = height;				
			}

			if (this.mode > 0) {
				this.$refs.monitor1.moveTo(0,0);
				this.$refs.monitor2.moveTo(0,0);
				this.$refs.monitor3.moveTo(0,0);
				this.$refs.monitor4.moveTo(0,0);
			}

			if (this.mode == 1) {
				this.$refs.monitor1.resizeTo(this.width, this.height);
				this.$refs.monitor2.resizeTo(0, 0);
				this.$refs.monitor3.resizeTo(0, 0);
				this.$refs.monitor4.resizeTo(0, 0);
			} else if (this.mode == 2) {
				this.$refs.monitor2.resizeTo(this.width, this.height);
				this.$refs.monitor1.resizeTo(0, 0);
				this.$refs.monitor3.resizeTo(0, 0);
				this.$refs.monitor4.resizeTo(0, 0);				
			} else if (this.mode == 3) {
				this.$refs.monitor3.resizeTo(this.width, this.height);
				this.$refs.monitor1.resizeTo(0, 0);
				this.$refs.monitor2.resizeTo(0, 0);
				this.$refs.monitor4.resizeTo(0, 0);				
			} else if (this.mode == 4) {
				this.$refs.monitor4.resizeTo(this.width, this.height);
				this.$refs.monitor1.resizeTo(0, 0);
				this.$refs.monitor2.resizeTo(0, 0);
				this.$refs.monitor3.resizeTo(0, 0);		
			} else {
				this.$refs.monitor1.resizeTo(this.width / 2, this.height / 2);
				this.$refs.monitor2.resizeTo(this.width / 2, this.height / 2);
				this.$refs.monitor3.resizeTo(this.width / 2, this.height / 2);
				this.$refs.monitor4.resizeTo(this.width / 2, this.height / 2);

				this.$refs.monitor1.moveTo(0,0);
				this.$refs.monitor2.moveTo(this.width / 2, 0);
				this.$refs.monitor3.moveTo(0, this.height / 2);
				this.$refs.monitor4.moveTo(this.width / 2, this.height / 2);
			}
		},
		setMode: function(mode) {
			this.mode = mode;
			this.resizeTo();
		},
		clickMonitor: function(monitorI) {
			if (this.mode == 0) {
				this.setMode(monitorI);
			} else {
				this.setMode(0);
			}
		}
	}
}
</script>
<style>
	.screen {
		position: relative;
		cursor: pointer;
	}
</style>