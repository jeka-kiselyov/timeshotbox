<template>
  <div class="timeline_hover" v-bind:style="{ left: computedLeft, display: computedDisplay }"></div>
</template>

<script>
export default {
	props: ['x'],
	data() {
		return {
		}
	},
	computed: {
		computedLeft: function() {
			return this.x+'px';
	    },
	    computedDisplay: function() {
	    	if (this.x) {
	    		return 'block';
	    	} else {
	    		return 'none';
	    	}
	    }
	}
}
</script>

<style>
	.timeline_hover {
		position: absolute;
		height: 150px;
		width: 3px;
		overflow: hidden;
		background-color: #aff;
		z-index: 9003;
	}
</style>