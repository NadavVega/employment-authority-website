import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config'; 

export const eventService = {
    /**
     * Creates a new event in the Firestore database.
     */
    async createEvent(eventDetails, currentUser, userRole) {
        try {
            // WORKFLOW LOGIC: Admins auto-publish. Coordinators go to pending queue.
            const eventStatus = userRole === 'admin' ? 'published' : 'pending_approval';

            const payload = {
                // Mandatory Fields
                title: eventDetails.title,
                type: eventDetails.type,
                date: eventDetails.date, // YYYY-MM-DD for accurate sorting
                time: eventDetails.time,
                location: eventDetails.location,
                capacity: eventDetails.capacity,
                description: eventDetails.description,
                coordinatorPhone: eventDetails.coordinatorPhone,
                
                // Optional Media Fields
                media: {
                    photoUrl: eventDetails.photoUrl || null,
                    logoUrl: eventDetails.logoUrl || null,
                    videoUrl: eventDetails.videoUrl || null,
                },
                
                // System Metadata
                status: eventStatus, 
                createdBy: (currentUser && currentUser.uid) || (currentUser && currentUser.email) || 'demo_user',
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'events'), payload);
            
            // Return both the ID and the status so the UI knows what message to show
            return { id: docRef.id, status: eventStatus };

        } catch (error) {
            console.error("Error creating event:", error);
            throw new Error("Failed to upload the event.");
        }
    }
};