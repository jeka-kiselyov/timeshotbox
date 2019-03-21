<template>
  <div class="timeline" v-bind:style="{ width: computedWidth }" @mousemove="onMousemove" @mouseleave="onMouseleave" @click="onClick">
  	<timeline-timeframe-channel v-for="(timeframeSets, index) in timeframes" v-bind:timeframes="timeframeSets" v-bind:from="from" v-bind:to="to" v-bind:width="width" v-bind:position="channelsPositions[index]"></timeline-timeframe-channel>
  	<timeline-current v-bind:date="currentTime" ></timeline-current>
  	<timeline-hover v-bind:x="hoverX" ></timeline-hover>
  </div>
</template>

<script>
export default {
	props: ['width', 'timeframes'],
	data() {
		return {
			channelsPositions: [],
			currentTime: new Date(),
			hoverX: null
		}
	},
	watch: {
		timeframes: function() {
			let heightPerChannel = 150 / 4;
			this.channelsPositions = [];
			for (let i = 0; i < this.timeframes.length; i++) {
				let channelsPosition = {x: heightPerChannel*i, height: heightPerChannel*(i+1)};
				this.channelsPositions.push(channelsPosition);
			}
		}
	},
	methods: {
		setFromTo: function(from, to) {
			this.from = from;
			this.to = to;
		},
		// setTimeframes: function(timeframes) {
		// 	// this.from = timeframes[0];
		// 	// this.to = timeframes[timeframes.length - 1];
		// 	this.timeframes = timeframes;

		// 	// console.log('timeframes '+this.from);
		// 	// console.log('timeframes '+this.to);
		// },
		setCurrentTime: function(date) {
			this.currentTime = date;
		},
		onMousemove: function(event) {
			let x = event.clientX - (this.$el.getBoundingClientRect().left) || null;
			if (x) {
				this.hoverX = x;
			}
		},
		onMouseleave: function() {
			this.hoverX = null;
		},
		onClick: function(event) {
			let x = event.clientX - (this.$el.getBoundingClientRect().left) || null;
			if (x) {
				console.log(x);
				//// calculate date based on x
				let perc = x / this.width;

				if (this.to && this.from) {
					let totalTimeDiff = this.to.getTime() - this.from.getTime();
					let clickDate = new Date(this.from.getTime() + perc*totalTimeDiff);

					this.$emit('date', clickDate);					
				}
			}
		}
	},
	computed: {
		computedWidth: function() {
			return this.width+'px';
	    }
	}
}
</script>

<style>
	.timeline {
		position: absolute;
		height: 150px;
		overflow: hidden;
		-webkit-touch-callout: none; /* iOS Safari */
		-webkit-user-select: none; /* Safari */
		-khtml-user-select: none; /* Konqueror HTML */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* Internet Explorer/Edge */
		user-select: none;
	}
</style>