<template>
  <div class="timeframe_channel" v-bind:style="{ width: computedWidth, top: computedTop, height: computedHeight }" ><timeline-timeframe v-for="date in timeframes" v-bind:date="date" ></timeline-timeframe></div>
</template>

<script>
export default {
	props: ['timeframes', 'from', 'to', 'width', 'position'],
	data() {
		return {
		}
	},
	watch: {
		timeframes: function() {
			// console.log(this.timeframes);
		}
	},
	computed: {
		computedWidth: function() {
			return this.width+'px';
	    },
	    computedTop: function() {
	    	return this.position.x + 'px';
	    },
	    computedHeight: function() {
	    	return this.position.height + 'px';
	    }
	}
}
</script>

<style>
	.timeframe_channel {
		height: 150px;
		left: 0;
		top: 0;
		position: absolute;
		overflow: hidden;
		z-index: 9001;
	}
</style>