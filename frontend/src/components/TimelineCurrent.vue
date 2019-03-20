<template>
  <div class="current_timeframe" v-bind:style="{ left: computedLeft }"></div>
</template>

<script>
export default {
	props: ['date'],
	data() {
		return {
		}
	},
	computed: {
		computedLeft: function() {
			let parentFrom = this.$parent.from || new Date();
			let parentTo = this.$parent.to || new Date();

			let totalDiff = parentTo.getTime() - parentFrom.getTime();
			let thisDiff = this.date.getTime() - parentFrom.getTime();

			let position = Math.floor( (thisDiff / totalDiff) * this.$parent.width );

			return position+'px';
	    }
	}
}
</script>

<style>
	.current_timeframe {
		position: absolute;
		height: 150px;
		width: 3px;
		overflow: hidden;
		background-color: #faa;
		z-index: 9002;
	}
</style>