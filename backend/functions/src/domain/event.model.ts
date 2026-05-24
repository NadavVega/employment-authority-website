import * as admin from 'firebase-admin';

/**
 * Event Record for the JEA Platform.
 * Coordinators can manage these, while Guests and Employers can view/register.
 */
export interface IEvent {
  title: string;
  description: string;
  location: string;
  type: string; // e.g., 'workshop', 'seminar', 'networking'
  created_by: string; // User ID of the coordinator who created it
  event_date: admin.firestore.Timestamp;
  
  /** 
   * Map of attendees where the key is the user ID and value is an object with registration details.
   */
  attendees: Record<string, {
    registeredAt: admin.firestore.Timestamp;
    status: 'attending' | 'cancelled';
  }>;
}
