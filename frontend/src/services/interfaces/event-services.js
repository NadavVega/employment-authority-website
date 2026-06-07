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
    arrayUnion
} from 'firebase/firestore';

import { db } from '../firebase/config';

const cleanValue = (value, fallback = '') => {
    return value === undefined || value === null ? fallback : value;
};

const getUserDocIdFromEmail = (email) => {
    return String(email || '').trim().toLowerCase();
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
    async createEvent(eventDetails, currentUser, userRole) {
        try {
            const eventStatus = 'published';

            const payload = {
                title: eventDetails.title,
                type: eventDetails.type,
                date: eventDetails.date, 
                time: eventDetails.time,
                location: eventDetails.location,
                capacity: eventDetails.capacity,
                description: eventDetails.description,
                coordinatorPhone: eventDetails.coordinatorPhone,
                
                // CRITICAL FIX: These fields were missing from the database save payload
                isAccessible: eventDetails.isAccessible || false,
                accessibilityContactName: eventDetails.accessibilityContactName || '',
                accessibilityContactPhone: eventDetails.accessibilityContactPhone || '',
                paymentMethod: eventDetails.paymentMethod || 'none',
                price: eventDetails.price || '',
                discountDetails: eventDetails.discountDetails || '',
                paymentDetails: eventDetails.paymentDetails || '',
                
                media: {
                    photoUrl: eventDetails.photoUrl || null,
                    logoUrl: eventDetails.logoUrl || null,
                    videoUrl: eventDetails.videoUrl || null,
                },
                
                status: eventStatus, 
                createdBy: (currentUser && currentUser.uid) || (currentUser && currentUser.email) || 'demo_user',
                createdAt: serverTimestamp(),

                registeredCount: 0,
                registeredUids: [],
            };

            const docRef = await addDoc(collection(db, 'events'), payload);
            return { id: docRef.id, status: eventStatus };

        } catch (error) {
            console.error("Error creating event:", error);
            throw new Error("Failed to upload the event.");
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

    async updateEvent(eventId, updatedData) {
        try {
            const docRef = doc(db, 'events', eventId);
            await updateDoc(docRef, updatedData);
            return true;
        } catch (error) {
            console.error("Error updating event:", error);
            throw new Error("Failed to update the event.");
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

        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);

            if (!eventSnap.exists()) {
                throw new Error('EVENT_NOT_FOUND');
            }

            const eventData = eventSnap.data();

            if (eventData.status !== 'published') {
                throw new Error('EVENT_NOT_AVAILABLE');
            }

            const existingRegistration = await transaction.get(registrationRef);

            if (existingRegistration.exists()) {
                throw new Error('ALREADY_REGISTERED');
            }

            const isUnlimited =
                !eventData.capacity ||
                eventData.capacity === 'ללא הגבלה';

            const capacity = parseInt(eventData.capacity, 10) || 0;
            const registeredCount = parseInt(eventData.registeredCount, 10) || 0;

            if (!isUnlimited && registeredCount >= capacity) {
                throw new Error('EVENT_FULL');
            }

            const isFreeEvent = paymentMethod === 'none' || paymentMethod === 'free';

            transaction.set(registrationRef, {
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
        });

            transaction.update(eventRef, {
                registeredCount: registeredCount + 1,
                registeredUids: arrayUnion(employerData.uid),
                lastRegistrationAt: serverTimestamp()
            });
        });

        return {
            success: true,
            signupId
        };
    },

    getEmployerRegistrationProfile: async (currentUser) => {
        return buildEmployerProfileFromFirestore(currentUser);
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