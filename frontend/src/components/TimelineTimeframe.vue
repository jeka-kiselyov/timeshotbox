<template>
  <div class="timeframe" v-bind:style="{ left: computedLeft }"></div>
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
			let parentFrom = this.$parent.from;
			let parentTo = this.$parent.to;

			try {
				let totalDiff = parentTo.getTime() - parentFrom.getTime();
				let thisDiff = this.date.getTime() - parentFrom.getTime();

				let position = Math.floor( (thisDiff / totalDiff) * this.$parent.width );

				return position+'px';
			} catch(e) {
				return '0px';
			}
	    }
	}
}
</script>

<style>
	.timeframe {
		position: absolute;
		height: 150px;
		width: 1px;
		overflow: hidden;
		background-color: #afa;
		z-index: 9001;
		border: 0;
	}
</style>