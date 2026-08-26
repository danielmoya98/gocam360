import { BrnDateAdapter, BrnDateUnits, BrnDuration } from '@spartan-ng/brain/date-time';
import { DateTime } from 'luxon';

declare class BrnLuxonDateAdapter implements BrnDateAdapter<DateTime> {
    now(): DateTime<true>;
    set(date: DateTime, values: BrnDateUnits): DateTime<boolean>;
    add(date: DateTime, duration: BrnDuration): DateTime<boolean>;
    subtract(date: DateTime, duration: BrnDuration): DateTime<boolean>;
    compare(a: DateTime, b: DateTime): number;
    isEqual(a: DateTime, b: DateTime): boolean;
    isBefore(a: DateTime, b: DateTime): boolean;
    isAfter(a: DateTime, b: DateTime): boolean;
    isSameDay(a: DateTime, b: DateTime): boolean;
    isSameMonth(a: DateTime, b: DateTime): boolean;
    isSameYear(a: DateTime, b: DateTime): boolean;
    getYear(date: DateTime): number;
    getMonth(date: DateTime): number;
    getDate(date: DateTime): number;
    getDay(date: DateTime): number;
    getHours(date: DateTime): number;
    getMinutes(date: DateTime): number;
    getSeconds(date: DateTime): number;
    getMilliseconds(date: DateTime): number;
    getTime(date: DateTime<boolean>): number;
    startOfMonth(date: DateTime): DateTime<boolean>;
    endOfMonth(date: DateTime): DateTime<boolean>;
    startOfDay(date: DateTime): DateTime<boolean>;
    endOfDay(date: DateTime): DateTime<boolean>;
    create(values: BrnDateUnits): DateTime<true> | DateTime<false>;
}

export { BrnLuxonDateAdapter };
