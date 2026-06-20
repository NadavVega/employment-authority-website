const DEFAULT_EVENT_DURATION_MINUTES = 90;

const toDateValue = (value) => {
    if (!value) return null;

    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object' && typeof value.seconds === 'number') {
        const date = new Date(value.seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getDateParts = (value) => {
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return {
                year: Number(match[1]),
                month: Number(match[2]) - 1,
                day: Number(match[3]),
            };
        }
    }

    const date = toDateValue(value);
    if (!date) return null;

    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
    };
};

const parseTimeRange = (timeValue) => {
    const matches = String(timeValue || '').matchAll(/(\d{1,2}):(\d{2})/g);
    const times = Array.from(matches, ([, hours, minutes]) => ({
        hours: Number(hours),
        minutes: Number(minutes),
    })).filter(({ hours, minutes }) => (
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
    ));

    return {
        startTime: times[0] || null,
        endTime: times[1] || null,
    };
};

const buildDateFromParts = (dateParts, timeParts) => (
    new Date(
        dateParts.year,
        dateParts.month,
        dateParts.day,
        timeParts.hours,
        timeParts.minutes,
        0,
        0
    )
);

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const formatGoogleCalendarDate = (date) => (
    date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
);

export const getEventCalendarRange = (event) => {
    const startsAt = toDateValue(event?.startsAt);
    const endsAt = toDateValue(event?.endsAt);

    if (startsAt) {
        return {
            start: startsAt,
            end: endsAt && endsAt > startsAt
                ? endsAt
                : addMinutes(startsAt, DEFAULT_EVENT_DURATION_MINUTES),
        };
    }

    const dateParts = getDateParts(event?.date);
    const { startTime, endTime } = parseTimeRange(event?.time);

    if (!dateParts || !startTime) {
        return null;
    }

    const start = buildDateFromParts(dateParts, startTime);
    const end = endTime
        ? buildDateFromParts(dateParts, endTime)
        : addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES);

    return {
        start,
        end: end > start ? end : addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES),
    };
};

export const buildGoogleCalendarUrl = (event) => {
    const range = getEventCalendarRange(event);
    if (!range) return '';

    const params = [
        'action=TEMPLATE',
        `text=${encodeURIComponent(event?.title || '')}`,
        `dates=${formatGoogleCalendarDate(range.start)}/${formatGoogleCalendarDate(range.end)}`,
        `details=${encodeURIComponent(event?.description || '')}`,
        `location=${encodeURIComponent(event?.location || event?.address || '')}`,
    ];

    return `https://calendar.google.com/calendar/render?${params.join('&')}`;
};

export const buildOutlookCalendarUrl = (event) => {
    const range = getEventCalendarRange(event);
    if (!range) return '';

    const params = [
        `subject=${encodeURIComponent(event?.title || '')}`,
        `startdt=${encodeURIComponent(range.start.toISOString())}`,
        `enddt=${encodeURIComponent(range.end.toISOString())}`,
        `body=${encodeURIComponent(event?.description || '')}`,
        `location=${encodeURIComponent(event?.location || event?.address || '')}`,
    ];

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.join('&')}`;
};
