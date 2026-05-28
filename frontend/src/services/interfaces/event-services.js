import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config'; 

export const eventService = {
    async createEvent(eventDetails, currentUser, userRole) {
        try {
            const eventStatus = userRole === 'admin' ? 'published' : 'pending_approval';

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
    }
};