import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { EventForm } from '../components/events/event-form';
import { eventService } from '../services/interfaces/event-services';

export const EditEventPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const { currentUser, userRole, isAdmin } = useAuth(); 
    
    const [eventData, setEventData] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                console.log("Attempting to fetch event with ID:", id);
                const data = await eventService.getEventById(id);
                
                if (!data) {
                    console.error("Fetch returned undefined or null data for this ID.");
                } else {
                    console.log("Successfully fetched data:", data);
                }

                // Security Check: Commented out temporarily for debugging
                // if (!isAdmin && data && data.createdBy && data.createdBy !== currentUser?.uid) {
                //     console.warn("Unauthorized access attempt. Redirecting to /events");
                //     navigate('/events'); 
                //     return;
                // }
                
                setEventData(data);
            } catch (error) {
                // EXPOSING THE ERROR: Check your browser console to see exactly why it fails
                console.error("CRITICAL ERROR fetching event:", error.message);
                console.error("Full error object:", error);
                
                // Temporarily disabled the redirect so you can inspect the empty page and console
                // navigate('/events');
            } finally {
                setLoadingData(false);
            }
        };

        if (userRole !== undefined) {
             fetchEvent();
        }
    }, [id, currentUser, isAdmin, userRole, navigate]);

    if (userRole === undefined) return <div dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>טוען נתוני משתמש...</div>;
    
    if (userRole !== 'coordinator' && userRole !== 'admin') {
        return (
            <div dir="rtl" className="error-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                <h2>שגיאת הרשאה</h2>
                <p>אין לך גישה לעמוד זה. (Access Denied)</p>
                <button onClick={() => navigate('/')} className="btn-primary pill-btn" style={{ marginTop: '20px' }}>חזרה לדף הבית</button>
            </div>
        );
    }

    if (loadingData) return <div dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>טוען נתוני אירוע...</div>;

    return (
        <div className="flat-page-wrapper" dir="rtl">
            <div className="flat-header">
                <h1>עריכת אירוע</h1>
                <p>עדכן את פרטי האירוע מטה.</p>
                {/* Debugging Banner to show if data failed to load */}
                {!eventData && (
                    <div style={{background: '#fee2e2', color: '#991b1b', padding: '10px', marginTop: '10px', borderRadius: '8px'}}>
                        <strong>Warning:</strong> Failed to load event data. Please check the browser console (F12).
                    </div>
                )}
            </div>
            <EventForm 
                initialData={eventData} 
                isEditMode={true}
                onSuccess={() => navigate('/events')} 
                onCancel={() => navigate('/events')}         
            />
        </div>
    );
};

export default EditEventPage;