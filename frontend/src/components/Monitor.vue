<template>
  <div class="monitor" v-bind:style="{ width: computedWidth, height: computedHeight, left: computedLeft, top: computedTop }" @click="onClick"><shot ref="current" v-bind:data="currentShotData" v-bind:opacity="currentShotOpacity" v-bind:width="width"  v-bind:height="height" zindex="20001"></shot><shot ref="next" v-bind:data="nextShotData"  v-bind:opacity="nextShotOpacity"  v-bind:width="width"  v-bind:height="height" zindex="20000" ></shot></div>
</template>

<script>
export default {
	props: ['channel'],
	data() {
		return {
			width: 0,
			height: 0,
			left: 0,
			top: 0,
			shotsCount: 0,
			currentDate: new Date(),
			currentShotData: null,
			nextShotData: null,
			currentShotOpacity: 1,
			nextShotOpacity: 0
		}
	},
	created: function(){
		this._days = {};
		this._diffBetweenShots = null;
		this._newestShotDate = null;

		this.loadDays();
	},
	computed: {
		computedWidth: function() {
			return ''+this.width+'px';
	    },
		computedHeight: function() {
			return ''+this.height+'px';
	    },
		computedLeft: function() {
			return ''+this.left+'px';
	    },
		computedTop: function() {
			return ''+this.top+'px';
	    }
	},
	methods: {
		onClick: function() {
			this.$emit('click');
		},
		hasShotsInTheFuture: function() {
			if (this._newestShotDate > this._date) {
				return true;
			} else {
				return false;
			}
		},
		handleEvent: function(eventObj) {
			this.processDayAPIResponse(eventObj);
			// console.log(eventObj);
			this.$emit('dayDone');
		},
		getDaysWithData: function() {
			return Object.keys(this._days);
		},
		resizeTo: function(width, height) {
			this.width = width;
			this.height = height;
		},
		moveTo: function(x, y) {
			this.left = x;
			this.top = y;
		},
		getNextShotTime: function() {
			if (this.nextShotData && this.nextShotData.date) {
				return this.nextShotData.date;
			}

			return null;
		},
		getTimeframes: function(fromDate, toDate) {
			let dates = []; 
			
			fromDate = new Date(fromDate.getTime());

			let fromDateString = this.dateToDayString(fromDate);
			let toDateString = this.dateToDayString(toDate);

			if (fromDate > toDate || !(fromDate instanceof Date && !isNaN(fromDate))) {
				return dates;
			}

			let extra = 0;
			do {
				if (this._days[fromDateString]) {
					let channelDay = this._days[fromDateString];
					for (let i = 0; i < channelDay.shots.length; i++) {
						if (channelDay.shots[i].date >= fromDate && channelDay.shots[i].date <= toDate) {
							dates.push(channelDay.shots[i].date);
						}
					}
				}
				fromDate.setUTCDate(fromDate.getUTCDate()+1);
				fromDate.setUTCHours(0,0,0,0);
				fromDateString = this.dateToDayString(fromDate);
				
				if (fromDate > toDate) {
					extra++;
				}
			} while(extra <= 2);

			return dates;
		},
		recalculateOpacity() {
			let initialC = 1;  /// initial is so current is fully visible and next is transparent
			let initialN = 0;

			if (this.currentShotData) {
				let diffWithInitial = this._date.getTime() - this.currentShotData.date.getTime();
				let k = diffWithInitial / this._diffBetweenShots;

				initialC = 1 - k;
				initialN = k;

				this.currentShotOpacity = initialC;
				this.nextShotOpacity = 1;
			} else {
				this.currentShotOpacity = 0;
				this.nextShotOpacity = 1;
			}
		},
		setDate: function(date) {
			this._date = date;

			let dayString = this.dateToDayString(date);
			let waitForDayDataPromise = null;
			if (!this._days[dayString] || !this._days[dayString].hasShots) {
				waitForDayDataPromise = this.loadDay(dayString);
			} else {
				waitForDayDataPromise = new Promise((resolve)=>{resolve();});
			}

			waitForDayDataPromise.then(()=>{
				///// day data is ready here and shots inside day are sorted
				let firstMatchI = null;

				for (let i = 0; i < this._days[dayString].shots.length; i++) {
					if (this._days[dayString].shots[i].date >= date) {
						firstMatchI = i;
						break;
					}
				}

				if (firstMatchI !== this._lastFirstMatchI) {
					///// shot is changed
					this._lastFirstMatchI = firstMatchI;

					let waitForOtherDayPromise = null;
					let nexDayDate =  new Date(this._date.getTime());
					nexDayDate.setDate(nexDayDate.getDate() + 1);


					if (firstMatchI) {
						//this.nextShotData = this._days[dayString].shots[firstMatchI];
						if (firstMatchI > 0) {
							//this.currentShotData = this._days[dayString].shots[firstMatchI - 1];
						} else {
							//// get current shot data from the prev day
							let dateToLoad = new Date(this._date.getTime());
							dateToLoad.setDate(dateToLoad.getDate() - 1);
							waitForOtherDayPromise = this.loadDay(dateToLoad);
						}
					} else {
						//// get next shot date from the next day
						let dateToLoad = nexDayDate;
						waitForOtherDayPromise = this.loadDay(dateToLoad);
					}

					if (!waitForOtherDayPromise) {
						waitForOtherDayPromise = new Promise((resolve)=>{resolve();});
					}

					waitForOtherDayPromise.then((dayObject)=>{
						if (firstMatchI) {
							this.nextShotData = this._days[dayString].shots[firstMatchI];
							if (firstMatchI > 0) {
								this.currentShotData = this._days[dayString].shots[firstMatchI - 1];							
							} else {
								///// get current shot to be the last on the prev day
								this.currentShotData = dayObject.shots.length ? dayObject.shots[dayObject.shots.length - 1] : null; 
							}
						} else {
							this.currentShotData = this._days[dayString].shots.length ? this._days[dayString].shots[this._days[dayString].shots.length - 1] : null;
							this.nextShotData = dayObject.shots.length ? dayObject.shots[0] : null; 
						}

						if (this.nextShotData && this.currentShotData) {
							this._diffBetweenShots = Math.abs(this.nextShotData.date - this.currentShotData.date);							
						}
						this.recalculateOpacity();

						this.preloadNextShots(this._days[dayString], firstMatchI, nexDayDate);
					});
				} else { /// if (firstMatchI !== this._lastFirstMatchI)
					this.recalculateOpacity();
				}
			});
		},
		preloadNextShots: function(dayObject, fromI, nexDayDate) {
			let count = 2;
			let needToPreloadTheNextDay = false;

			if (fromI + count > dayObject.shots.length - 1) {
				needToPreloadTheNextDay = true;
			}

			return new Promise((resolve)=>{
				if (fromI === null) {
					return resolve();
				}

				let promises = [];
				for (let i = fromI; i < (fromI + count); i++) {
					if (i < dayObject.shots.length - 1) {
						if (!dayObject.shots[i].hasPreloaded) {
							promises.push(new Promise((resolve)=>{
								let img = new Image();
								img.onload = ()=>{
									resolve();
								};
								img.onerror = ()=>{
									resolve();
								};
								img.src = dayObject.shots[i].fileName;
								console.log("Preloading "+img.src);
								dayObject.shots[i].hasPreloaded = true;
							}));							
						}						
					} else {
					}
				}
				Promise.all(promises).then(()=>{
					if (!needToPreloadTheNextDay) {
						resolve(true);
					} else {
						if (nexDayDate) {
							console.log('Need to preload the next day');
							this.loadDay(nexDayDate).then((dayObject)=>{
								this.preloadNextShots(dayObject, 0);
							});							
						}
						resolve(true);
					}
				});
			});
		},
		sortShots: function(dayString) {
			this._days[dayString].shots.sort((a,b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
		},
		dateToDayString: function(date) {
			return (date.getUTCFullYear() + '_' + (date.getUTCMonth()+1) + '_' + date.getUTCDate());
		},
		loadDateIfNeeded: function() {
			let promises = [];

			let dateToLoad = new Date(this._date.getTime());
			dateToLoad.setDate(dateToLoad.getDate() - 1);

			/// load prev, current and next days
			for (let i = 0; i < 3; i++) {
				let dayString = this.dateToDayString(dateToLoad);

				if (!this._days[dayString]) {
					let dayObject = {
						dayString: dayString,
						shots: [],
						hasShots: false
					};
					this._days[dayString] = dayObject;
				}

				if (this._days[dayString] && !this._days[dayString].hasShots) {
					promises.push(this.loadDay(this._days[dayString]));					
				}

				dateToLoad.setDate(dateToLoad.getDate() + 1);
			}

			Promise.all(promises).then(()=>{

			}).catch(()=>{

			});
		},
		processDaysAPIResponse: function(apiResponse) {
			try {
				var dayString = apiResponse;
				var dayObject = {
					dayString: dayString,
					shots: [],
					hasShots: false,
					isLoaded: false
				};

				if (!this._days[dayString]) {
					this._days[dayString] = dayObject;
				}

				return this._days[dayString];
			} catch(e) {

			}
		},
		processDayAPIResponse: function(apiResponse) {
			try {
				var shotDate = new Date(apiResponse.date);
				var dayString = this.dateToDayString(shotDate);

				let dayObject = this._days[dayString];

				if (!dayObject) {
					dayObject = {
						dayString: dayString,
						shots: [],
						hasShots: false,
						isLoaded: true
					};
					this._days[dayString] = dayObject;					
				}

				var shotObject = {
					date: shotDate,
					fileName: apiResponse.fileName,
					spriteCoordinates: apiResponse.spriteCoordinates || undefined
				};

				let shotTime = shotObject.date.getTime();
				let isThereAlready = false;
				for (let i = 0; i < dayObject.shots.length; i++) {
					if (dayObject.shots[i].date.getTime() === shotTime) {
						/// need to substitute
						dayObject.shots[i].fileName = apiResponse.fileName;
						dayObject.shots[i].spriteCoordinates = apiResponse.spriteCoordinates;
						isThereAlready = true;
					}
				}

				if (!isThereAlready) {
					dayObject.shots.push(shotObject);
					if (this._newestShotDate < shotDate) {
						this._newestShotDate = shotDate;
					}				
				}
				dayObject.hasShots = true;
			} catch(e) {

			}
		},
		loadDays: function() {
			var vm = this;

			return new Promise((resolve, reject)=>{
				axios.get('/api/channel/'+this.channel)
					.then(function(response) {
						if (response.data) {
							for (var dayString of response.data) {
								vm.processDaysAPIResponse(dayString);
							}
						}

						vm.$emit('daysUpdated', vm._days);
						vm.$emit('daysDone');

						resolve(vm._days);
					})
					.catch(function(){
						vm._days = {};
						vm.$emit('daysDone');

						resolve(vm._days);
					});
			});
		},
		loadDay: function(day) {
			let dayString = undefined;
			if (Object.prototype.toString.call(day) === '[object Date]') {
				/// if day is Date instance
				dayString = day.getUTCFullYear()+'_'+(day.getUTCMonth() + 1)+'_'+day.getUTCDate();
			} else if (day.dayString) {
				dayString = day.dayString;
			} else {
				dayString = ''+day;
			}

			var vm = this;
			if (vm._days[dayString] && vm._days[dayString].isLoaded) {
				return new Promise((resolve)=>{
					resolve(vm._days[dayString]);
				});
			}

			return new Promise((resolve, reject)=>{
				axios.get('/api/channel/'+this.channel+'/day/'+dayString)
					.then(function(response) {
						if (response.data) {
							for (var shot of response.data) {
								vm.processDayAPIResponse(shot);
							}
						}
						vm.sortShots(dayString);
						vm.$emit('dayDone');

						resolve(vm._days[dayString]);
					})
					.catch(function(){
						let dayObject = vm.processDaysAPIResponse(dayString);
						dayObject.isLoaded = true;

						vm.$emit('dayDone');
						resolve(vm._days[dayString]);
					});		
			});
		}
	}
};
</script>

<style>
	.monitor {
		position: absolute;
		width: 1200px;
		height: 800px;
		border: 0;
		padding: 0;
		margin: 0;
		overflow: hidden;
		left: 0;
		top: 0;
	}
</style>