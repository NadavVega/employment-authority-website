// src/utils/eventImageMap.js
// DEMO: images stored locally, no Firebase Storage needed.
// To add a new image: drop it in src/assets/images/events/ and add an entry below.

import img1 from '../assets/images/events/יריד-תעסוקה.jpeg';
import img2 from '../assets/images/events/יריד-תעסוקה-הר-הצופים.jpeg';
import img3 from '../assets/images/events/יריד-תעסוקה-כיוון.jpeg';
import img4 from '../assets/images/events/כנס-שנתי.jpeg';
import img5 from '../assets/images/events/מגזר-ציבורי.jpeg';
import img6 from '../assets/images/events/משרד-העבודה.jpeg';

export const EVENT_IMAGE_OPTIONS = [
    { label: 'יריד תעסוקה',           value: 'יריד-תעסוקה',           src: img1 },
    { label: 'יריד תעסוקה הר הצופים', value: 'יריד-תעסוקה-הר-הצופים', src: img2 },
    { label: 'יריד תעסוקה כיוון',     value: 'יריד-תעסוקה-כיוון',     src: img3 },
    { label: 'כנס שנתי',              value: 'כנס-שנתי',              src: img4 },
    { label: 'מגזר ציבורי',           value: 'מגזר-ציבורי',           src: img5 },
    { label: 'משרד העבודה',           value: 'משרד-העבודה',           src: img6 },
];

// Use this everywhere you need to show an event image (card, page, carousel)
export const resolveEventImage = (event) => {
    if (!event) return null;

    if (event.image) {
        const found = EVENT_IMAGE_OPTIONS.find(o => o.value === event.image);
        if (found) return found.src;
    }

    if (event.photoUrl) return event.photoUrl;

    // Supports old/custom-upload preview data if it exists in Firestore
    if (event.photoPreview) return event.photoPreview;

    if (event.media?.photoUrl) return event.media.photoUrl;

    return null;
};
