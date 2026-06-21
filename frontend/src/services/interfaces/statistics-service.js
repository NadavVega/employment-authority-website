import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';

import { db } from '../firebase/config';
import { CENTER_COLORS } from '../../utils/centerColors';
import { getEventCenterName } from '../../utils/centerIcons';

const FINISHED_STATUSES = new Set(['finished', 'completed', 'ended']);
const EXCLUDED_EVENT_STATUSES = new Set(['deleted', 'rejected', 'cancelled', 'canceled']);
const EXCLUDED_REGISTRATION_STATUSES = new Set([
    'cancelled',
    'canceled',
    'removed',
    'unregistered',
    'deleted',
]);
const MUNICIPAL_BLUE = '#003b8b';
const MONTH_LABELS = [
    'ינו׳',
    'פבר׳',
    'מרץ',
    'אפר׳',
    'מאי',
    'יוני',
    'יולי',
    'אוג׳',
    'ספט׳',
    'אוק׳',
    'נוב׳',
    'דצמ׳',
];

const emptyStatistics = () => ({
    totals: {
        activeEvents: 0,
        finishedEvents: 0,
        registrationsThisMonth: 0,
        registrationsThisYear: 0,
    },
    eventsByPeriod: {
        currentMonth: { active: 0, finished: 0 },
        currentYear: { active: 0, finished: 0 },
        finished: { active: 0, finished: 0 },
        total: { active: 0, finished: 0 },
    },
    monthlyEvents: MONTH_LABELS.map((month, index) => ({
        month,
        monthIndex: index,
        active: 0,
        finished: 0,
    })),
    eventsByCenter: {},
    registrationsByCenter: {},
    registrationsByCompany: {},
    registrationsByMonth: {},
    activeSignedUsersByCenter: {},
    currentMonthSignedUsersByCenter: {},
    createdEventsByCenter: {},
    allParticipantsByCenter: {},
    donutCards: [],
    centerCards: [],
});

const cleanValue = (value, fallback = '') => (
    value === undefined || value === null ? fallback : String(value).trim()
);

const getCoordinatorCenterName = (currentUser) => cleanValue(
    currentUser?.centerName ||
    currentUser?.center ||
    currentUser?.profile?.centerName ||
    currentUser?.profile?.center
);

const toDate = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (value instanceof Date) return value;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isSameMonth = (date, now) => (
    date &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
);

const isSameYear = (date, now) => (
    date &&
    date.getFullYear() === now.getFullYear()
);

const getMonthKey = (date) => {
    if (!date) return 'unknown';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getEventStartDate = (event) => (
    toDate(event.startsAt) ||
    toDate(event.startDate) ||
    toDate(event.date) ||
    toDate(event.createdAt) ||
    toDate(event.endsAt) ||
    toDate(event.endDate)
);

const getEventEndDate = (event) => (
    toDate(event.endsAt) ||
    toDate(event.endDate) ||
    toDate(event.startsAt) ||
    toDate(event.startDate) ||
    toDate(event.date)
);

const isEventInCurrentMonth = (event, now) => isSameMonth(getEventStartDate(event), now);

const isEventInCurrentYear = (event, now) => isSameYear(getEventStartDate(event), now);

const getEventStatusBucket = (event, now) => {
    const status = cleanValue(event.status).toLowerCase();

    if (EXCLUDED_EVENT_STATUSES.has(status)) {
        return 'excluded';
    }

    if (FINISHED_STATUSES.has(status)) {
        return 'finished';
    }

    const eventEndDate = getEventEndDate(event);
    if (eventEndDate && eventEndDate < now) {
        return 'finished';
    }

    return 'active';
};

const normalizeEvent = (docSnapshot) => {
    const data = docSnapshot.data() || {};
    const centerName = getEventCenterName({
        centerName: data.centerName,
        center: data.center,
        eventCenter: data.eventCenter,
    });

    return {
        id: docSnapshot.id,
        centerName,
        status: cleanValue(data.status),
        startsAt: data.startsAt || '',
        startDate: data.startDate || '',
        endsAt: data.endsAt || '',
        endDate: data.endDate || '',
        date: data.date || '',
        createdAt: data.createdAt || '',
        createdByEmail: cleanValue(data.createdByEmail),
        coordinatorEmail: cleanValue(data.coordinatorEmail),
        registeredCount: Number.parseInt(data.registeredCount, 10) || 0,
        raw: data,
    };
};

const normalizeRegistration = (docSnapshot) => {
    const data = docSnapshot.data() || {};
    const registeredAt =
        toDate(data.registeredAt) ||
        toDate(data.createdAt) ||
        toDate(data.signedAt);

    return {
        id: docSnapshot.id,
        companyName: cleanValue(
            data.companyName ||
            data.company ||
            data.organization,
            'לא צוין'
        ),
        centerName: getEventCenterName({
            centerName: data.centerName,
            center: data.center,
        }),
        registeredAt,
        status: cleanValue(data.status).toLowerCase(),
    };
};

const isActiveRegistration = (registration) => (
    !EXCLUDED_REGISTRATION_STATUSES.has(cleanValue(registration.status).toLowerCase())
);

const increment = (target, key, amount = 1) => {
    const safeKey = cleanValue(key, 'לא צוין') || 'לא צוין';
    target[safeKey] = (target[safeKey] || 0) + amount;
};

const getCenterColor = (centerName) => CENTER_COLORS[centerName] || MUNICIPAL_BLUE;

const buildCenterSlices = (counts) => (
    Object.entries(counts)
        .map(([centerName, value]) => ({
            centerName,
            name: centerName,
            value,
            color: getCenterColor(centerName),
        }))
        .filter((item) => item.value > 0)
        .sort((first, second) => second.value - first.value)
);

const loadEventsForCoordinator = async (centerName) => {
    const eventsRef = collection(db, 'events');
    const centerFields = ['centerName', 'center', 'eventCenter'];
    const snapshots = await Promise.all(
        centerFields.map((fieldName) => getDocs(query(eventsRef, where(fieldName, '==', centerName))))
    );

    const byId = new Map();
    snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((docSnapshot) => {
            byId.set(docSnapshot.id, docSnapshot);
        });
    });

    return Array.from(byId.values());
};

const loadEvents = async ({ isAdmin, isCoordinator, centerName }) => {
    if (isAdmin) {
        const snapshot = await getDocs(collection(db, 'events'));
        return snapshot.docs;
    }

    if (isCoordinator && centerName) {
        return loadEventsForCoordinator(centerName);
    }

    return [];
};

const loadEventRegistrations = async (eventId) => {
    const registrationsRef = collection(db, 'events', eventId, 'registrations');
    const snapshot = await getDocs(registrationsRef);
    return snapshot.docs.map(normalizeRegistration);
};

const buildStatistics = async (events, centerFilter) => {
    const now = new Date();
    const statistics = emptyStatistics();
    const normalizedCenterFilter = centerFilter ? getEventCenterName(centerFilter) : '';

    for (const event of events) {
        if (normalizedCenterFilter && event.centerName !== normalizedCenterFilter) {
            continue;
        }

        const statusBucket = getEventStatusBucket(event.raw, now);
        if (statusBucket === 'excluded') {
            continue;
        }

        const eventCenter = event.centerName || 'לא צוין';
        const eventStartDate = getEventStartDate(event.raw);

        increment(statistics.createdEventsByCenter, eventCenter);

        if (statusBucket === 'active') {
            statistics.totals.activeEvents += 1;
            statistics.eventsByPeriod.total.active += 1;

            if (isEventInCurrentMonth(event.raw, now)) {
                statistics.eventsByPeriod.currentMonth.active += 1;
            }

            if (isEventInCurrentYear(event.raw, now)) {
                statistics.eventsByPeriod.currentYear.active += 1;
            }

            if (eventStartDate && eventStartDate.getFullYear() === now.getFullYear()) {
                statistics.monthlyEvents[eventStartDate.getMonth()].active += 1;
            }
        } else {
            statistics.totals.finishedEvents += 1;
            statistics.eventsByPeriod.total.finished += 1;
            statistics.eventsByPeriod.finished.finished += 1;

            if (isEventInCurrentMonth(event.raw, now)) {
                statistics.eventsByPeriod.currentMonth.finished += 1;
            }

            if (isEventInCurrentYear(event.raw, now)) {
                statistics.eventsByPeriod.currentYear.finished += 1;
            }

            if (eventStartDate && eventStartDate.getFullYear() === now.getFullYear()) {
                statistics.monthlyEvents[eventStartDate.getMonth()].finished += 1;
            }
        }

        increment(statistics.eventsByCenter, eventCenter);

        const registrations = await loadEventRegistrations(event.id);
        registrations.forEach((registration) => {
            if (!isActiveRegistration(registration)) {
                return;
            }

            const registrationCenter = normalizedCenterFilter || registration.centerName || eventCenter;

            increment(statistics.registrationsByCenter, registrationCenter);
            increment(statistics.registrationsByCompany, registration.companyName);
            increment(statistics.registrationsByMonth, getMonthKey(registration.registeredAt));
            increment(statistics.allParticipantsByCenter, registrationCenter);

            if (statusBucket === 'active') {
                increment(statistics.activeSignedUsersByCenter, registrationCenter);
            }

            if (isSameMonth(registration.registeredAt, now)) {
                statistics.totals.registrationsThisMonth += 1;
                increment(statistics.currentMonthSignedUsersByCenter, registrationCenter);
            }

            if (isSameYear(registration.registeredAt, now)) {
                statistics.totals.registrationsThisYear += 1;
            }
        });
    }

    const centerNames = new Set([
        ...Object.keys(statistics.eventsByCenter),
        ...Object.keys(statistics.registrationsByCenter),
    ]);

    statistics.centerCards = Array.from(centerNames)
        .filter(Boolean)
        .map((centerName) => ({
            centerName,
            activeEvents: 0,
            finishedEvents: 0,
            registrations: statistics.registrationsByCenter[centerName] || 0,
            color: getCenterColor(centerName),
        }));

    events.forEach((event) => {
        if (normalizedCenterFilter && event.centerName !== normalizedCenterFilter) {
            return;
        }

        const card = statistics.centerCards.find((item) => item.centerName === event.centerName);
        if (!card || getEventStatusBucket(event.raw, now) === 'excluded') {
            return;
        }

        if (getEventStatusBucket(event.raw, now) === 'active') {
            card.activeEvents += 1;
        } else {
            card.finishedEvents += 1;
        }
    });

    statistics.centerCards.sort((first, second) => (
        first.centerName.localeCompare(second.centerName, 'he')
    ));

    statistics.donutCards = [
        {
            key: 'activeSignedUsers',
            title: 'נרשמים פעילים',
            total: Object.values(statistics.activeSignedUsersByCenter).reduce((sum, value) => sum + value, 0),
            slices: buildCenterSlices(statistics.activeSignedUsersByCenter),
        },
        {
            key: 'currentMonthSignedUsers',
            title: 'נרשמים החודש',
            total: Object.values(statistics.currentMonthSignedUsersByCenter).reduce((sum, value) => sum + value, 0),
            slices: buildCenterSlices(statistics.currentMonthSignedUsersByCenter),
        },
        {
            key: 'createdEvents',
            title: 'אירועים שנוצרו',
            total: Object.values(statistics.createdEventsByCenter).reduce((sum, value) => sum + value, 0),
            slices: buildCenterSlices(statistics.createdEventsByCenter),
        },
        {
            key: 'allParticipants',
            title: 'משתתפים בכל הזמנים',
            total: Object.values(statistics.allParticipantsByCenter).reduce((sum, value) => sum + value, 0),
            slices: buildCenterSlices(statistics.allParticipantsByCenter),
        },
    ];

    return statistics;
};

export const statisticsService = {
    getCoordinatorCenterName,

    async getStatistics({ currentUser, userRole, isAdmin = false, isCoordinator = false } = {}) {
        const centerName = getCoordinatorCenterName(currentUser);

        if (!isAdmin && (isCoordinator || userRole === 'coordinator') && !centerName) {
            return {
                ...emptyStatistics(),
                centerName: '',
                missingCenter: true,
            };
        }

        const eventDocs = await loadEvents({
            isAdmin: isAdmin || userRole === 'admin',
            isCoordinator: isCoordinator || userRole === 'coordinator',
            centerName,
        });

        const events = eventDocs.map(normalizeEvent);
        const scopedCenter = isAdmin || userRole === 'admin' ? '' : centerName;
        const statistics = await buildStatistics(events, scopedCenter);

        return {
            ...statistics,
            centerName: scopedCenter,
            missingCenter: false,
        };
    },
};
