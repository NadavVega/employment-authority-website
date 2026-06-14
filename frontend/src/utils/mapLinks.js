const ONLINE_LOCATION_PATTERN = /מקוון|אונליין|online|zoom|זום/i;

export const isOnlineEvent = (event) => {
    const location = event?.location || event?.address || '';
    return Boolean(event?.isOnline || event?.online || ONLINE_LOCATION_PATTERN.test(location));
};

export const getEventLocation = (event) => event?.location || event?.address || '';

export const getMapSearchUrl = (event) => {
    const location = getEventLocation(event);
    if (!location || isOnlineEvent(event)) return '';

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};
