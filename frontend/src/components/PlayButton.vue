<template>
	<div class="play_button" @click="onClick">
		<div class="play_button_button"><i class="fas fa-pause-circle" v-if="isPlaying"></i><i class="fas fa-play-circle" v-else></i></div>
	</div>
</template>
<script>
export default {
	data () {
		return {
			isPlaying: false
		}
	},
	methods: {
		onClick: function() {
			this.isPlaying = !this.isPlaying;
			if (this.isPlaying) {
				this.$emit('play');
			} else {
				this.$emit('pause');
			}
		}
	}
}
</script>
<style>
	.play_button {
		width: 150px;
		cursor: pointer;
		color: white;
	}

	.play_button:hover {
		color: #ccc;
	}

	.play_button_button {
		font-size: 120px;
		padding: 13px 0 0 13px;
	}

</style>