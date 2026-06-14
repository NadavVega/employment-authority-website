import academicCareerIcon from '../assets/center-icons/academic-career.png';
import hebrewCareerIcon from '../assets/center-icons/hebrew-career.png';
import hizdamnutIcon from '../assets/center-icons/hizdamnut.png';
import kivunIcon from '../assets/center-icons/kivun.png';
import qualitaIcon from '../assets/center-icons/qualita.png';
import riyanIcon from '../assets/center-icons/riyan.png';
import employmentIcon from '../assets/center-icons/taasuka-logo-color.png';
import vatikimIcon from '../assets/center-icons/vatikim.png';

const normalizeCenterValue = (value) => String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,/\\()[\]{}:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const CENTER_DEFINITIONS = [
    { name: 'מרכז כיוון', aliases: ['כיוון', 'מרכז כוון', 'kivun', 'kivun center'], icon: kivunIcon },
    { name: 'מרכז הזדמנות', aliases: ['הזדמנות', 'hizdamnut', 'hazdamnut'], icon: hizdamnutIcon },
    { name: 'מרכז פיתוח קריירה לאקדמאים', aliases: ['פיתוח קריירה לאקדמאים', 'מרכז קריירה לאקדמאים', 'אקדמאים', 'academic career'], icon: academicCareerIcon },
    { name: 'מרכז ריאן', aliases: ['ריאן', 'ריאן ירושלים', 'riyan', 'ryan'], icon: riyanIcon },
    { name: 'מרכז ותיקים בעבודה', aliases: ['ותיקים בעבודה', 'מרכז ותיקים', 'ותיקים', 'vatikim'], icon: vatikimIcon },
    { name: 'קעליטה', aliases: ['קליטה', 'קווליטה', 'qualita'], icon: qualitaIcon },
    {
        name: 'מרכז הקריירה האוניברסיטה העיברית',
        aliases: [
            'מרכז הקריירה האוניברסיטה העברית',
            'מרכז הקריירה באוניברסיטה העברית',
            'מרכז הקריירה באוניברסיטה העיברית',
            'אוניברסיטה העברית',
            'אוניברסיטה העיברית',
            'hebrew-career',
            'hebrew career',
        ],
        icon: hebrewCareerIcon,
    },
    { name: 'תוכניות לעולים', aliases: ['תכניות לעולים', 'תוכניות תעסוקה לעולים', 'עולים', 'taasuka'], icon: employmentIcon },
    { name: 'coordinators-only', aliases: ['coordinator-only', 'coordinators only', 'coordinator only', 'רכזים בלבד'], icon: employmentIcon },
];

const flattenCandidate = (value) => {
    if (Array.isArray(value)) return value.flatMap(flattenCandidate);
    if (value && typeof value === 'object') {
        return [
            value.name,
            value.centerName,
            value.displayName,
            value.label,
            value.title,
            value.id,
            value.value,
        ].flatMap(flattenCandidate);
    }
    return [value];
};

const getCenterCandidates = (eventOrCenter) => {
    if (typeof eventOrCenter === 'string' || typeof eventOrCenter === 'number') {
        return [eventOrCenter];
    }

    if (!eventOrCenter || typeof eventOrCenter !== 'object') return [];

    return [
        eventOrCenter.center,
        eventOrCenter.centerName,
        eventOrCenter.centerId,
        eventOrCenter.eventCenter,
        eventOrCenter.targetAudience,
        eventOrCenter.coordinatorsOnly ? 'coordinators-only' : '',
        eventOrCenter.type === 'coordinators-only' ? 'coordinators-only' : '',
    ].flatMap(flattenCandidate);
};

export const getCenterDefinition = (eventOrCenter) => {
    const candidates = getCenterCandidates(eventOrCenter)
        .map(normalizeCenterValue)
        .filter(Boolean);

    return CENTER_DEFINITIONS.find(({ name, aliases }) => {
        const terms = [name, ...aliases].map(normalizeCenterValue);
        return candidates.some(candidate =>
            terms.some(term => candidate === term || candidate.includes(term))
        );
    }) || null;
};

export const getEventCenterName = (eventOrCenter) => {
    const definition = getCenterDefinition(eventOrCenter);
    if (definition) return definition.name;

    const rawValue = getCenterCandidates(eventOrCenter)
        .map(value => String(value || '').trim())
        .find(Boolean);

    return rawValue || '';
};

export const getCenterIcon = (eventOrCenter) => getCenterDefinition(eventOrCenter)?.icon || null;
