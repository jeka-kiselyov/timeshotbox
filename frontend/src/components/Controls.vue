<template>
	<div class="controls" v-bind:style="{ width: computedWidth }">
		<div class="controls_block" v-bind:style="{ width: computedPlayButtonWidth }">
			<play-button ref="playButton" v-bind:width="widths.playButton"></play-button>
		</div>
		<div class="controls_block" v-bind:style="{ width: computedCalendarWidth, left: computedCalendarX }">
			<calendar ref="calendar" v-bind:width="widths.calendar" v-bind:markers="daysWithData"></calendar>
		</div>
		<div class="controls_block" v-bind:style="{ width: computedTimelineWidth, left: computedTimelineX }">
			<timeline ref="timeline" v-bind:width="widths.timeline" v-bind:timeframes="timeframes"></timeline>
		</div>
	</div>
</template>

<script>

export default {
	props: ['timeframes'],
	data() {
		return {
			daysWithData: [],
			width: 0,
			widths: {
				total: 0,
				playButton: 150,
				calendar: 250,
				timeline: 0
			},
			offsets: {
				playButton: 0,
				calendar: 150,
				timeline: 400
			}
		}
	},
	mounted: function() {
		this.$refs.timeline.$on('date', (date)=>{
			this.$emit('date', date);
		});
		this.$refs.calendar.$on('dateSelected', (date)=>{

			if (date && date.date) {
				date = ''+date.date;
				date = date.split('_');
				date = new Date(date[0], date[1]-1, date[2]);
				date.setHours(12, 0, 0);
				this.$emit('date', date);				
			}
		});
		this.$refs.playButton.$on('play', ()=>{
			this.$emit('play');
		});
		this.$refs.playButton.$on('pause', ()=>{
			this.$emit('pause');
		});

		// this.recalculateWidth();
	},
	watch: {
		width: function() {
			this.recalculateWidth();
		}
	},
	methods: {
		setDaysWithData: function(days) {
			this.daysWithData = days;
			console.log(days);
		},
		resizeTo: function(width, height) {
			this.width = width;
			this.recalculateWidth();
		},
		recalculateWidth: function() {
			let size = {
				width: this.$el ? this.$el.clientWidth : 0,
				height: this.$el ? this.$el.clientHeight : 0
			};

			size.width = size.width || parseInt(''+this.width, 10);

			this.widths.total = size.width;
			// this.widths.playButton = 150;
			// this.widths.calendar = (this.widths.total - this.widths.playButton) * 0.2;
			this.widths.timeline = (this.widths.total - this.widths.playButton - this.widths.calendar);

			this.offsets.calendar = this.widths.playButton;
			this.offsets.timeline = this.offsets.calendar + this.widths.calendar;
		},
		setFromTo: function(from, to) {
			this.$refs.timeline.setFromTo(from, to);
		},
		// setTimeframes: function(timeframes) {
		// 	this.$refs.timeline.setTimeframes(timeframes);
		// },
		setCurrentTime: function(date) {
			this.$refs.timeline.setCurrentTime(date);
			this.$refs.calendar.chooseTargetDate(date);
		}
	},
	computed: {
		computedWidth: function() {
			return this.width+'px';
	    },
	    computedCalendarX: function() {
	    	return this.offsets.calendar+'px';
	    },
	    computedTimelineX: function() {
	    	return this.offsets.timeline+'px';
	    },
	    computedCalendarWidth: function() {
			return this.widths.calendar+'px';
	    },
	    computedTimelineWidth: function() {
			return this.widths.timeline+'px';
	    },
	    computedPlayButtonWidth: function() {
	    	return this.widths.playButton+'px';
	    }
	}
}
</script>

<style>
	.controls {
		border: 0;
		padding: 0;
		margin: 0;
		overflow: hidden;;
	}
	.controls_block {
		height: 150px;
		width: 150px;
		position: absolute;
		z-index: 999;
	}
</style>