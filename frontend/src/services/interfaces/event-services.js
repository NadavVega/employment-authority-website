import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    runTransaction,
    query,
    collectionGroup,
    where,
    getDocs,
    orderBy,
    Timestamp
} from 'firebase/firestore';

import { db } from '../firebase/config';

const cleanValue = (value, fallback = '') => {
    return value === undefined || value === null ? fallback : value;
};

const buildEventMedia = (eventDetails) => {
    const photoUrl =
        cleanValue(eventDetails.photoUrl) ||
        cleanValue(eventDetails.photoPreview) ||
        cleanValue(eventDetails.media?.photoUrl);

    return {
        photoUrl,
        logoUrl: cleanValue(eventDetails.logoUrl) || cleanValue(eventDetails.media?.logoUrl),
        videoUrl: cleanValue(eventDetails.videoUrl) || cleanValue(eventDetails.media?.videoUrl),
    };
};

const EVENT_OWNERSHIP_FIELDS = [
    'createdBy',
    'createdByEmail',
    'createdByUid',
    'creatorEmail',
    'creatorUid',
    'ownerEmail',
    'ownerUid',
    'coordinatorEmail',
];

const COORDINATOR_EVENT_UPDATE_FIELDS = [
    'title',
    'type',
    'date',
    'time',
    'startsAt',
    'endsAt',
    'location',
    'capacity',
    'description',
    'coordinatorPhone',
    'coordinatorName',
    'center',
    'isOnline',
    'isAccessible',
    'accessibilityContactName',
    'accessibilityContactPhone',
    'paymentMethod',
    'price',
    'discountDetails',
    'paymentDetails',
    'media',
    'image',
    'photoUrl',
    'logoUrl',
    'photoPreview',
    'status',
];

const getUserDocIdFromEmail = (email) => {
    return String(email || '').trim().toLowerCase();
};

const getTimestampDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
};

const getRegisteredUids = (eventData = {}) => (
    Array.isArray(eventData.registeredUids) ? eventData.registeredUids : []
);

const getRegisteredCount = (eventData = {}) => (
    Number.isInteger(eventData.registeredCount) ? eventData.registeredCount : 0
);

const buildEventTimeRange = (date, time) => {
    const [startTime, endTime] = String(time || '').split('-');

    if (!date || !startTime || !endTime) {
        throw new Error('EVENT_TIME_RANGE_MISSING');
    }

    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        endsAt < startsAt
    ) {
        throw new Error('EVENT_TIME_RANGE_INVALID');
    }

    return {
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
    };
};

const buildEmployerProfileFromFirestore = async (currentUser) => {
    if (!currentUser?.uid) {
        throw new Error('USER_ID_MISSING');
    }

    if (!currentUser?.email) {
        throw new Error('USER_EMAIL_MISSING');
    }

    const emailDocId = getUserDocIdFromEmail(currentUser.email);
    const publicProfileRef = doc(db, 'users', emailDocId);
    const publicSnap = await getDoc(publicProfileRef);

    const publicProfile = publicSnap.exists() ? publicSnap.data() : {};
    const profile = publicProfile.profile || {};

    const fallbackName =
        currentUser.displayName ||
        profile.fullName ||
        publicProfile.fullName ||
        publicProfile.name ||
        currentUser.email;

    return {
        uid: currentUser.uid,

        employerName:
            cleanValue(publicProfile.name) ||
            cleanValue(publicProfile.fullName) ||
            cleanValue(profile.fullName) ||
            fallbackName,

        displayName:
            cleanValue(publicProfile.name) ||
            cleanValue(publicProfile.fullName) ||
            cleanValue(profile.fullName) ||
            fallbackName,

        email: cleanValue(currentUser.email),

        center:
            cleanValue(publicProfile.center) ||
            cleanValue(publicProfile.connectedCenter) ||
            cleanValue(profile.center) ||
            cleanValue(profile.field) ||
            '',

        companyName:
            cleanValue(publicProfile.companyName) ||
            cleanValue(publicProfile.organization) ||
            cleanValue(publicProfile.company) ||
            cleanValue(publicProfile.businessName) ||
            cleanValue(profile.company) ||
            cleanValue(profile.organization) ||
            '',

        role: 'employer'
    };
};

export const eventService = {
    async createEvent(eventDetails, currentUser) {
        try {
            const eventStatus = 'published';
            const eventTimeRange = buildEventTimeRange(
                eventDetails.date,
                eventDetails.time
            );
            const media = buildEventMedia(eventDetails);

            const payload = {
                title: eventDetails.title,
                type: eventDetails.type,
                date: eventDetails.date, 
                time: eventDetails.time,
                ...eventTimeRange,
                location: eventDetails.location,
                capacity: eventDetails.capacity,
                description: eventDetails.description,
                coordinatorName: cleanValue(eventDetails.coordinatorName),
                coordinatorPhone: eventDetails.coordinatorPhone,
                center: cleanValue(eventDetails.center),
                isOnline: eventDetails.isOnline === true,
                
                // CRITICAL FIX: These fields were missing from the database save payload
                isAccessible: eventDetails.isAccessible || false,
                accessibilityContactName: eventDetails.accessibilityContactName || '',
                accessibilityContactPhone: eventDetails.accessibilityContactPhone || '',
                paymentMethod: eventDetails.paymentMethod || 'none',
                price: eventDetails.price || '',
                discountDetails: eventDetails.discountDetails || '',
                paymentDetails: eventDetails.paymentDetails || '',

                image: eventDetails.image || '',
                photoUrl: media.photoUrl,
                photoPreview: eventDetails.photoPreview || '',
                logoUrl: media.logoUrl,
                media,
                
                status: eventStatus, 
                createdBy: (currentUser && currentUser.uid) || (currentUser && currentUser.email) || 'demo_user',
                createdByUid: (currentUser && currentUser.uid) || '',
                createdByEmail: (currentUser && currentUser.email) || '',
                createdAt: serverTimestamp(),

                registeredCount: 0,
                registeredUids: [],
            };

            console.log('Event create debug', {
                firestorePath: 'events',
                currentUserUid: currentUser?.uid || '',
                currentUserEmail: currentUser?.email || '',
                userRole: eventDetails?.userRole || '',
                isOnline: payload.isOnline === true,
                eventPayload: payload,
                eventPayloadKeys: Object.keys(payload)
            });

            const docRef = await addDoc(collection(db, 'events'), payload);
            return { id: docRef.id, status: eventStatus };

        } catch (error) {
            console.error("Error creating event:", {
                code: error?.code || '',
                message: error?.message || '',
                error
            });
            throw new Error("Failed to upload the event.", { cause: error });
        }
    },

    async getEventById(eventId) {
        try {
            const docRef = doc(db, 'events', eventId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.warn("No such event found in Firestore!");
                return null;
            }
        } catch (error) {
            console.error("Error fetching event by ID:", error);
            throw error;
        }
    },

    async getArchivedEvents() {
        try {
            const archivedEventsQuery = query(
                collection(db, 'events'),
                where('status', '==', 'archived'),
                orderBy('date', 'desc')
            );
            const snapshot = await getDocs(archivedEventsQuery);

            return snapshot.docs.map((docSnapshot) => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            }));
        } catch (error) {
            console.error("Error fetching archived events:", error);
            throw error;
        }
    },

    async updateEvent(eventId, updatedData) {
        try {
            const docRef = doc(db, 'events', eventId);
            const existingSnap = await getDoc(docRef);
            const existingData = existingSnap.exists() ? existingSnap.data() : {};
            const rawPayload = { ...updatedData };
            let payload = {};

            delete rawPayload.id;

            EVENT_OWNERSHIP_FIELDS.forEach((field) => {
                if (Object.prototype.hasOwnProperty.call(existingData, field)) {
                    rawPayload[field] = existingData[field];
                } else {
                    delete rawPayload[field];
                }
            });

            if (rawPayload.date && rawPayload.time) {
                Object.assign(
                    rawPayload,
                    buildEventTimeRange(rawPayload.date, rawPayload.time)
                );
            }

            if (rawPayload.userRole === 'coordinator') {
                COORDINATOR_EVENT_UPDATE_FIELDS.forEach((field) => {
                    if (Object.prototype.hasOwnProperty.call(rawPayload, field)) {
                        payload[field] = rawPayload[field];
                    }
                });

                EVENT_OWNERSHIP_FIELDS.forEach((field) => {
                    if (Object.prototype.hasOwnProperty.call(rawPayload, field)) {
                        payload[field] = rawPayload[field];
                    }
                });
            } else {
                payload = { ...rawPayload };
                delete payload.currentUserUid;
                delete payload.currentUserEmail;
                delete payload.userRole;
            }

            console.log('Event update debug', {
                eventId,
                currentUserUid: updatedData?.currentUserUid || '',
                currentUserEmail: updatedData?.currentUserEmail || '',
                userRole: updatedData?.userRole || '',
                existingCreatedBy: existingData.createdBy || '',
                existingCreatedByUid: existingData.createdByUid || '',
                existingCreatedByEmail: existingData.createdByEmail || '',
                existingCoordinatorEmail: existingData.coordinatorEmail || '',
                existingAssignedCoordinatorEmail: existingData.assignedCoordinatorEmail || '',
                rawPayloadKeys: Object.keys(rawPayload),
                updatePayloadKeys: Object.keys(payload),
                updatePayload: payload
            });

            await updateDoc(docRef, payload);
            return true;
        } catch (error) {
            console.error("Error updating event:", {
                code: error?.code || '',
                message: error?.message || '',
                error
            });
            throw new Error("Failed to update the event.", { cause: error });
        }
    },

    registerToEvent: async (eventId, employerData, paymentMethod = 'none') => {
        if (!eventId) {
            throw new Error('EVENT_ID_MISSING');
        }

        if (!employerData?.uid) {
            throw new Error('USER_ID_MISSING');
        }

        const eventRef = doc(db, 'events', eventId);
        const registrationRef = doc(db, 'events', eventId, 'registrations', employerData.uid);

        const signupId = `${eventId}_${employerData.uid}`;
        const registeredAtISO = new Date().toISOString();

        try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);

            if (!eventSnap.exists()) {
                throw new Error('EVENT_NOT_FOUND');
            }

            const eventData = eventSnap.data();

            if (eventData.status !== 'published') {
                throw new Error('EVENT_NOT_AVAILABLE');
            }

            const eventEndsAt = getTimestampDate(eventData.endsAt);

            if (!getTimestampDate(eventData.startsAt) || !eventEndsAt) {
                throw new Error('EVENT_TIME_RANGE_MISSING');
            }

            if (eventEndsAt.getTime() < Date.now()) {
                throw new Error('EVENT_PASSED');
            }

            console.log('Event registration existing registration read path', `events/${eventId}/registrations/${employerData.uid}`);
            const existingRegistration = await transaction.get(registrationRef);
            const currentRegisteredUids = getRegisteredUids(eventData);

            if (
                existingRegistration.exists() ||
                currentRegisteredUids.includes(employerData.uid)
            ) {
                throw new Error('ALREADY_REGISTERED');
            }

            const isUnlimited =
                !eventData.capacity ||
                eventData.capacity === 'ללא הגבלה';

            const capacity = parseInt(eventData.capacity, 10) || 0;
            const registeredCount = getRegisteredCount(eventData);

            if (!isUnlimited && registeredCount >= capacity) {
                throw new Error('EVENT_FULL');
            }

            const isFreeEvent = paymentMethod === 'none' || paymentMethod === 'free';
            const eventUpdatePayload = {
                registeredCount: registeredCount + 1,
                registeredUids: [...currentRegisteredUids, employerData.uid],
                lastRegistrationAt: serverTimestamp()
            };
            const registrationPath = `events/${eventId}/registrations/${employerData.uid}`;
            const eventPath = `events/${eventId}`;

            const registrationPayload = {
            signupId,
            uid: employerData.uid,

            employerName: employerData.employerName || employerData.displayName || 'ללא שם',
            displayName: employerData.displayName || employerData.employerName || 'ללא שם',
            email: employerData.email || '',
            center: employerData.center || '',
            companyName: employerData.companyName || '',

            role: 'employer',
            paymentMethod,
            status: isFreeEvent ? 'registered' : 'pending_payment',

            registeredAt: serverTimestamp(),
            registeredAtISO
        };

            console.log('Event registration debug snapshot', {
                eventId,
                currentUserUid: employerData.uid,
                currentUserEmail: employerData.email || '',
                userRole: employerData.role || 'employer',
                registrationPath,
                eventPath,
                existingEventData: eventData,
                existingRegistrationExists: existingRegistration.exists(),
                oldRegisteredUids: currentRegisteredUids,
                finalRegisteredUids: eventUpdatePayload.registeredUids,
                oldRegisteredCount: registeredCount,
                newRegisteredCount: eventUpdatePayload.registeredCount,
                eventStatus: eventData.status,
                eventStartsAt: eventData.startsAt,
                eventEndsAt: eventData.endsAt,
                eventCapacity: eventData.capacity
            });
            console.log('Event registration document path', registrationPath);
            console.log('Event registration payload', registrationPayload);

            console.log('Event registration event update path', eventPath);
            console.log('Event registration event update payload', eventUpdatePayload);

            transaction.set(registrationRef, registrationPayload);
            transaction.update(eventRef, eventUpdatePayload);
        });
        } catch (error) {
            console.error('Event registration Firebase error', {
                code: error?.code || '',
                message: error?.message || '',
                error
            });
            console.error('Event registration Firebase full error object', error);
            throw error;
        }

        return {
            success: true,
            signupId
        };
    },

    getEmployerRegistrationProfile: async (currentUser) => {
        return buildEmployerProfileFromFirestore(currentUser);
    },

    getEventRegistrations: async (eventId) => {
        if (!eventId) return [];

        const registrationsRef = collection(db, 'events', eventId, 'registrations');
        const snapshot = await getDocs(registrationsRef);

        return snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data() || {};

            return {
                id: docSnapshot.id,
                email: cleanValue(data.email),
                name: cleanValue(data.name) || cleanValue(data.employerName) || cleanValue(data.displayName),
                fullName: cleanValue(data.fullName) || cleanValue(data.displayName) || cleanValue(data.employerName),
                displayName: cleanValue(data.displayName),
                companyName: cleanValue(data.companyName),
                phone: cleanValue(data.phone),
                phoneNumber: cleanValue(data.phoneNumber),
                mobile: cleanValue(data.mobile),
                registeredAt: data.registeredAt || data.createdAt || data.signedAt || data.registeredAtISO || '',
                createdAt: data.createdAt || '',
                signedAt: data.signedAt || '',
                centerName: cleanValue(data.centerName),
                center: cleanValue(data.center),
                userCenter: cleanValue(data.userCenter),
                status: cleanValue(data.status),
            };
        });
    },

    getUserRegisteredEventIds: async (uid) => {
    if (!uid) return [];

    const regsQuery = query(
        collectionGroup(db, 'registrations'),
        where('uid', '==', uid)
    );

    const snapshot = await getDocs(regsQuery);

    return snapshot.docs
        .map((docSnapshot) => docSnapshot.ref.parent.parent?.id)
        .filter(Boolean);
},
};
