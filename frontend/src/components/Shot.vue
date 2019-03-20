<template>
  <div class="shot" v-bind:style="{ width: computedWidth, height: computedHeigh, backgroundImage: computedBackgroundImage, backgroundPosition: backgroundPosition, backgroundSize: backgroundSize, opacity: opacity, zIndex: zindex }">

  </div>
</template>

<script>
export default {
	props: ['width', 'height', 'data', 'zindex', 'opacity'],
	data() {
		return {
			backgroundImage: null,
			spriteCoordinates: null,
			backgroundSize: null,
			backgroundPosition: null
		}
	},
	computed: {
		computedWidth: function() {
			return ''+this.width+'px';
	    },
		computedHeigh: function() {
			return ''+this.height+'px';
	    },
	    computedBackgroundImage: function() {
	    	if (this.backgroundImage) {
		    	return "url('"+this.backgroundImage+"')";	    		
	    	} else {
	    		return "";
	    	}
	    }
	},
	watch: {
		width: function() {
			this.calculateBackgroundShifts();
		},
		height: function() {
			this.calculateBackgroundShifts();
		},
		data: function() {
			if (this.data) {
				this.backgroundImage = this.data.fileName;
				this.spriteCoordinates = this.data.spriteCoordinates;
			} else {
			}

			this.calculateBackgroundShifts();
		},
		opacity: function(){
		}
	},
	created: function(){
	},
	methods: {
		setData: function(shotData) {
			this.backgroundImage = shotData.fileName;
		},
		calculateBackgroundShifts: function() {
			if (!this.spriteCoordinates) {
				this.backgroundPosition = '0px 0px';
				this.backgroundSize = '100% 100%';
			} else {
	    		var widthK = this.width / this.spriteCoordinates.width;
	    		var heightK = this.height / this.spriteCoordinates.height;

	    		var bgWidth = widthK*this.spriteCoordinates.sWidth;
	    		var bgHeight = heightK*this.spriteCoordinates.sHeight;

	    		// console.log("Sprite size: "+this.spriteCoordinates.width+"px "+this.spriteCoordinates.height+"px");
	    		// console.log("Sprite pos: "+this.spriteCoordinates.x+"px "+this.spriteCoordinates.y+"px");

	    		// console.log("K: "+widthK+" "+heightK);

	    		this.backgroundPosition = "-"+(this.spriteCoordinates.x*widthK)+"px -"+(this.spriteCoordinates.y*heightK)+"px";	
	    		// this.backgroundPosition = ""+(this.spriteCoordinates.x)+"px "+(this.spriteCoordinates.y)+"px";	
	    		// console.log("position: "+this.backgroundPosition);
	    		this.backgroundSize = ""+bgWidth+"px "+bgHeight+"px";	
	    		// console.log("size: "+this.backgroundSize);				
			}
		}
	}
};
</script>

<style>
	.shot {
		width: 1200px;
		height: 800px;
		background-color: black;
		position: absolute;
		z-index: 10000;
		opacity: 0.8;
	}
</style>