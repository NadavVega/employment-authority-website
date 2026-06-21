import { getEventCalendarRange } from './calendarLinks';

export const toSafeDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object' && typeof value.seconds === 'number') {
        const date = new Date(value.seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const isPastEvent = (event) => {
    const calendarRange = getEventCalendarRange(event);
    const explicitEndDate = toSafeDate(event?.endsAt || event?.endDate);
    const dateOnlyFallback = toSafeDate(event?.date || event?.startsAt);
    const endDate = calendarRange?.end || explicitEndDate || dateOnlyFallback;

    if (endDate && !calendarRange?.end && !explicitEndDate) {
        endDate.setHours(23, 59, 59, 999);
    }

    return endDate ? endDate.getTime() < Date.now() : false;
};
