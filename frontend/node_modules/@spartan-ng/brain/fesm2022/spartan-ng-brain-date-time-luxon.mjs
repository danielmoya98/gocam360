import { DateTime } from 'luxon';

class BrnLuxonDateAdapter {
    now() {
        return DateTime.now();
    }
    set(date, values) {
        return date.set(values);
    }
    add(date, duration) {
        return date.plus(duration);
    }
    subtract(date, duration) {
        return date.minus(duration);
    }
    compare(a, b) {
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }
    isEqual(a, b) {
        return a.equals(b);
    }
    isBefore(a, b) {
        return a < b;
    }
    isAfter(a, b) {
        return a > b;
    }
    isSameDay(a, b) {
        return a.hasSame(b, 'day') && a.hasSame(b, 'month') && a.hasSame(b, 'year');
    }
    isSameMonth(a, b) {
        return a.hasSame(b, 'month') && a.hasSame(b, 'year');
    }
    isSameYear(a, b) {
        return a.hasSame(b, 'year');
    }
    getYear(date) {
        return date.year;
    }
    getMonth(date) {
        return date.month;
    }
    getDate(date) {
        return date.day;
    }
    getDay(date) {
        // Adjust the range, Luxon calculates week days starting with Monday 1 to Sunday 7
        // , and we should return Sunday 0 to Saturday 6
        return date.weekday % 7;
    }
    getHours(date) {
        return date.hour;
    }
    getMinutes(date) {
        return date.minute;
    }
    getSeconds(date) {
        return date.second;
    }
    getMilliseconds(date) {
        return date.millisecond;
    }
    getTime(date) {
        return date.toMillis();
    }
    startOfMonth(date) {
        return date.startOf('month');
    }
    endOfMonth(date) {
        return date.endOf('month');
    }
    startOfDay(date) {
        return date.startOf('day');
    }
    endOfDay(date) {
        return date.endOf('day');
    }
    create(values) {
        return DateTime.fromObject(values);
    }
}

/**
 * Generated bundle index. Do not edit.
 */

export { BrnLuxonDateAdapter };
//# sourceMappingURL=spartan-ng-brain-date-time-luxon.mjs.map
