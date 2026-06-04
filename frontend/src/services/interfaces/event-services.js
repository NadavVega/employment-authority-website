import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config'; 

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

    /**
     * Safely registers an employer to an event using a Transaction to prevent overbooking.
     * @param {string} eventId - The ID of the event.
     * @param {object} userData - Denormalized user data (uid, name, email, etc.)
     * @param {string} paymentMethod - 'free', 'link', or 'bit'
     */
    registerToEvent: async (eventId, userData, paymentMethod = 'free') => {
        const eventRef = doc(db, 'events', eventId);
        const registrationRef = doc(db, 'events', eventId, 'registrations', userData.uid);

        try {
            await runTransaction(db, async (transaction) => {
                const eventDoc = await transaction.get(eventRef);
                
                if (!eventDoc.exists()) {
                    throw new Error("EVENT_NOT_FOUND");
                }

                const eventData = eventDoc.data();
                const isUnlimited = !eventData.capacity || eventData.capacity === 'ללא הגבלה';
                const capacity = parseInt(eventData.capacity) || 0;
                const registeredCount = parseInt(eventData.registeredCount) || 0;

                // 1. Race Condition Protection: Check Capacity
                if (!isUnlimited && registeredCount >= capacity) {
                    throw new Error("EVENT_FULL");
                }

                // 2. Double Registration Protection
                const regDoc = await transaction.get(registrationRef);
                if (regDoc.exists()) {
                    throw new Error("ALREADY_REGISTERED");
                }

                // 3. Write the updated count to the Event
                transaction.update(eventRef, {
                    registeredCount: registeredCount + 1
                });

                // 4. Create the Registration Document (Data Duplication for fast Coordinator access)
                let initialStatus = paymentMethod === 'free' ? 'registered' : 'pending_payment';

                transaction.set(registrationRef, {
                    uid: userData.uid,
                    displayName: userData.displayName || 'ללא שם',
                    companyName: userData.companyName || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    status: initialStatus,
                    registeredAt: new Date().toISOString()
                });
            });

            return { success: true };
        } catch (error) {
            console.error("Registration Transaction Failed:", error);
            throw error; 
        }
    },

    /**
     * Fetches all event IDs a specific user is registered for.
     * Used by the UI to disable buttons and show the ✅ checkmark.
     * @param {string} uid - The Employer's UID
     */
    getUserRegisteredEventIds: async (uid) => {
        try {
            // A Collection Group Query searches ALL 'registrations' sub-collections across the entire database
            const regsQuery = query(collectionGroup(db, 'registrations'), where('uid', '==', uid));
            const snapshot = await getDocs(regsQuery);
            
            // Extract the Event ID from the document reference path
            return snapshot.docs.map(docSnapshot => {
                // path looks like: events/eventId/registrations/uid
                // .parent gets the 'registrations' collection, .parent gets the 'event' doc
                return docSnapshot.ref.parent.parent.id; 
            });
        } catch (error) {
            console.error("Failed to fetch user's registered events:", error);
            return [];
        }
    }
};