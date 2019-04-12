<template>
  <div id="calendar">
    <div class="calendar-header">
      <div class="month-switch">
        <span class="prev" @click="handleMonthSwitch('prev')"></span>
        <span>{{currentDateObj.yearMonth}}</span>
        <span class="next" @click="handleMonthSwitch('next')"></span>
      </div>
    </div>
    <div class="calendar-content">
      <ul class="week">
        <li v-for="(day,index) in weekTxt" :key="index">{{day}}</li>
      </ul>
      <ul class="month">
        <li v-for="(item,index) in days" :key="index" :class="[dayClasses(item), item.className]">
          <span
            @click="handleDayChoose(item,index)"
            v-if="!(item.isOtherMonthDay&&hideOtherMonthDay)"
          >{{item.day}}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
<script>
  const util = {
    isLeapYear(year) {
        return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
    },
    getDateObj(date) {
      if (typeof date === 'string' || date instanceof String) {
        date = date.split('_').join('-');
      }
        const dateObj = date ? new Date(date) : new Date()
        return {
            year: dateObj.getFullYear(),
            month: dateObj.getMonth() + 1,
            day: dateObj.getDate(),
            week: dateObj.getDay() 
        }
    },
    /**
    * @description get target date  or today timestamp
    * @param {String} date 
    * @return {Number} 
    */
    getTimestamp(date) {
        return !date ? +new Date() : +new Date(this.formatDate(date, 'YYYY_MM_DD'))
    },
    /**
    * @description conver date by lang
    * @param {Object} year|month|day
    * @return {String} format
    */
    formatDate(date, format) {
        const { year, month, day } = this.getDateObj(date)
        return format.replace(/\[.*?\]|Y{2,4}|M{1,2}|D{1,2}|SSS/g, (match) => {
            return {
                YY: String(year).slice(-2),
                YYYY: year,
                M: month,
                MM: month > 9 ? month : `0${month}`,
                D: day,
                DD: day > 9 ? day : `0${day}`
            }[match]
        })
    },
    /**
    * @description get the total days in the month
    * @param {Number} year
    * @param {Number} month
    * @return {Number} totalDays
    */
    getTotalDays(year, month) {
        return month == 2 ? (this.isLeapYear(year) ? 29 : 28) :
            String(month).match(/\[.*?\]|4|6|9|11|SSS/g) ? 30 : 31
    }
};
export default {
  props: {
    markers: {
      type: Array,
      default: []
    },
    weekText: Array,
    disabledFutureDay: {
      type: Boolean,
      default: false
    },
    hideOtherMonthDay: {
      type: Boolean,
      default: false
    },
    hideOtherMonthMarker: {
      type: Boolean,
      default: true
    },
    format: {
      type: String,
      default: "YYYY_MM_DD"
    },
    sundayBegin: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    weekTxt() {
      const weekText = ["S", "M", "T", "W", "T", "F", "S"];
      return this.weekText
        ? this.weekText
        : this.sundayBegin
        ? weekText
        : weekText.push(weekText.shift()) && weekText;
    }
  },
  data() {
    return {
      days: [],
      currentDateObj: {
        date: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        yearMonth: ""
      }
    };
  },
  watch: {
    markers() {
      this.initCalendar();
    },
    "currentDateObj.year"() {
      this.initCalendar();
    },
    "currentDateObj.month"() {
      this.initCalendar();
    },
    "currentDateObj.date"(date) {
      const connector = this.format.match(/[^A-Z]/)[0];
      const dateArr = date.split(connector);
      this.currentDateObj.yearMonth = `${dateArr[0]}${connector}${dateArr[1]}`;
      this.$emit("date", this.matchDayByDate(date));
    }
  },
  created() {
    this.initCalendar();
  },
  methods: {
    dayClasses(item) {
      return {
        "choose-day": this.currentDateObj.date === item.date,
        "disabled-day": this.disabledFutureDay && item.isFutureDay,
        "other-month-day": item.isOtherMonthDay,
        "weekend-day": [0, 6, 7].includes(item.week)
      };
    },
    /**
     * @description init month
     */
    initCalendar() {
      const { year, month, day } = this.currentDateObj;
      const prevMonth = month === 1 ? 12 : month - 1;
      const nextMonth = month === 12 ? 1 : month + 1;

      const currentMonthAllDays = this.handleDays(year, month);
      let prevMonthAllDays = this.handleDays(year, prevMonth, true);
      let nextMonthAllDays = this.handleDays(year, nextMonth, true);

      // get the first day and the last day of the month is the day of the week
      let firstDay = currentMonthAllDays[0].week;
      let lastDay = currentMonthAllDays[currentMonthAllDays.length - 1].week;

      // handle sunday begin
      this.sundayBegin ? (lastDay += 1) : (firstDay -= 1);

      // concat prev month and next month

      const nextMonthFewDays = nextMonthAllDays.splice(0, 7 - lastDay);
      const prevMonthFewDays = prevMonthAllDays.splice(
        prevMonthAllDays.length - firstDay,
        prevMonthAllDays.length - 1
      );

      // concat prev last few days and next month first few days
      prevMonthFewDays
        .concat(nextMonthFewDays)
        .map(item => (item["isOtherMonthDay"] = true));

      this.days = [
        ...prevMonthFewDays,
        ...currentMonthAllDays,
        ...nextMonthFewDays
      ];
      this.currentDateObj.date = this.formatDate(`${year}-${month}-${day}`);
    },
    /**
     * @description switch month
     * @param {String} type prev or next
     */
    handleMonthSwitch(type) {
      // prev month
      let { year, month } = this.currentDateObj;
      if (type === "prev") {
        if (month > 1) {
          month--;
        } else {
          year--;
          month = 12;
        }
      }
      // next month
      if (type === "next") {
        if (month < 12) {
          month++;
        } else {
          year++;
          month = 1;
        }
      }

      const switchAfterMonthTotalDays = util.getTotalDays(year, month);
      // avoid month cross-border
      const today = util.getDateObj().day > switchAfterMonthTotalDays;
      const choosedDday = this.currentDateObj.day > switchAfterMonthTotalDays;

      if (today || choosedDday) {
        this.currentDateObj.day = switchAfterMonthTotalDays;
      }
      const formatDate = this.formatDate(
        `${year}_${month}_${this.currentDateObj.day}`
      );
      this.currentDateObj.year = year;
      this.currentDateObj.month = month;
      this.currentDateObj.date = formatDate;

      if (this.currentDateObj) {
        this.$emit("dateSelected", this.matchDayByDate(this.currentDateObj.date));        
      }
    },
    /**
     * @description choose one day
     * @param {Object} item
     */
    handleDayChoose(item) {
      if (!(this.disabledFutureDay && item.isFutureDay)) {
        if (item.isOtherMonthDay) {
          return item.day > 7
            ? this.handleMonthSwitch("prev")
            : this.handleMonthSwitch("next");
        }
        const { year, month } = this.currentDateObj;
        this.currentDateObj.day = item.day;
        this.currentDateObj.date = this.formatDate(
          `${year}-${month}-${item.day}`
        );

        this.$emit("dateSelected", this.matchDayByDate(this.currentDateObj.date));
      }
    },

    /**
     * @description get the total days in the month
     * @param {Number} year
     * @param {Number} month
     * @return {Array} days
     */
    handleDays(year, month, isOtherMonths = false) {
      let days = [];
      const totalDays = util.getTotalDays(year, month);
      if (isOtherMonths) {
        if (month === 1) year += 1;
        if (month === 12) year -= 1;
      }

      for (let i = 0; i < totalDays; i++) {
        const day = i + 1;
        const date = `${year}_${month}_${day}`;

        let week = util.getDateObj(date).week;
        if (!this.sundayBegin && week === 0) week = 7;

        const dayObj = {
          day: day,
          date: this.formatDate(date),
          week: week,
          isFutureDay: util.getTimestamp() < util.getTimestamp(date)
        };

        // add marker
        const markers = this.markers;
        if (markers && (!isOtherMonths || !this.hideOtherMonthMarker)) {
          if (markers.indexOf(date) != -1) {
            dayObj["className"] = 'marker';
          }
        }
        days.push(dayObj);
      }
      return days;
    },
    /**
     * @description match month's day obj by the date string
     * @param {String} date
     */
    matchDayByDate(date) {
      return this.days.filter(item => item.date === date)[0];
    },
    // External method
    /**
     * @description need format date string
     * @param {String} date
     * @param {String} format string => default: 'YYYY-MM-DD'
     */
    formatDate(date, formatStr = this.format) {
      if (!date) throw "Missing required parameters";
      return util.formatDate(date, formatStr.toUpperCase());
    },
    /**
     * @description choose target date
     * @param {String} date
     */
    chooseTargetDate(date) {
      if (!date) throw "Missing required parameters";
      const { year, month, day } = util.getDateObj(date);
      this.currentDateObj.year = year;
      this.currentDateObj.month = month;
      this.currentDateObj.day = day;
      this.currentDateObj.date = this.formatDate(`${year}-${month}-${day}`);
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
ul {
  margin: 0;
  padding-left: 0;
}
li {
  list-style: none;
}

#calendar {
  /*min-width: 320px;*/
  color: #fff;
  font-size: 12px;
}
.calendar-header {
  position: relative;
}

.month-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 20px;
  padding: 0 20px;
  background-color: #232323;
}
.month-switch .prev,
.month-switch .next {
  width: 8px;
  height: 8px;
  border-top: 1px solid #fff;
  border-right: 1px solid #fff;
  cursor: pointer;
}

.month-switch .prev {
  transform: rotate(-135deg);
}

.month-switch .next {
  transform: rotate(45deg);
}
.calendar-content {
  color: #232323;
  background-color: #fff;
}
.week {
  display: flex;
  padding: 2px 0;
}
.week li {
  flex: 1;
  text-align: center;
  cursor: pointer;
}
.month {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 0;
}
.month li {
  width: 14.28%;
  margin-bottom: 2px;
  text-align: center;
}
.month span {
  display: inline-block;
  width: 15px;
  height: 15px;
  line-height: 15px;
  border-radius: 50%;
  text-align: center;
  cursor: pointer;
}


#calendar .other-month-day span {
  color: #ccc;
}

#calendar .disabled-day span {
  color: #ccc;
  background-color: transparent;
}

#calendar .marker span {
  color: black;
  background-color: #afa;
  border-radius: 0;
}

#calendar .choose-day span {
  color: #fff;
  background-color: #7373f3;
}
</style>
