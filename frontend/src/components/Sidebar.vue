<template>
	<div id="sidebar" v-bind:height="height"  v-bind:style="{height: computedHeight }">
		<div class="sidebar_buttons">
			<a href="#" class="sidebar_button" v-bind:class="{ active: isActive(1) }" @click="setMode(1)"><i class="fas fa-dice-one"></i></a>
			<a href="#" class="sidebar_button" v-bind:class="{ active: isActive(2) }" @click="setMode(2)"><i class="fas fa-dice-two"></i></a>
			<a href="#" class="sidebar_button" v-bind:class="{ active: isActive(3) }" @click="setMode(3)"><i class="fas fa-dice-three"></i></a>
			<a href="#" class="sidebar_button" v-bind:class="{ active: isActive(4) }" @click="setMode(4)"><i class="fas fa-dice-four"></i></a>
			<a href="#" class="sidebar_button sidebar_button_th" v-bind:class="{ active: isActive(0) }" @click="setMode(0)"><i class="fas fa-th-large"></i></a>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			width: 0,
			height: 0,
			mode: null
		}
	},
	methods: {
		resizeTo: function(width, height) {
			this.width = width;
			this.height = height;
		},
		setMode: function(mode) {
			if (mode != this.mode) {
				this.mode = mode;
				this.$emit('mode', mode);
			}
		},
		isActive: function(mode) {
			return this.mode == mode;
		}
	},
	computed: {
		computedWidth: function() {
			return ''+this.width+'px';
	    },
		computedHeight: function() {
			return ''+this.height+'px';
	    }
	}
}
</script>

<style>
	#sidebar {
		display: flex;
		height: 500px;
	}
	.sidebar_buttons {
		position: absolute;
		width: 150px;
		bottom: 0;
	}
	a.sidebar_button {
		display: block;
		color: white;
		font-size: 30px;
		text-align: center;
	}
	a.sidebar_button:hover {
		color: #aaa;
	}
	a.sidebar_button_th {
		margin-top: 15px;
		font-size: 27px;
	}
	a.active {
		color: #aaa;
	}
</style>