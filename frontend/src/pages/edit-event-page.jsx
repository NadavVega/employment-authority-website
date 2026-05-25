import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { EventForm } from '../components/events/event-form';
import { eventService } from '../services/interfaces/event-services';

export const EditEventPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // We infer loading state from currentUser === undefined if no explicit loading flag exists
    const { currentUser, userRole, isAdmin } = useAuth(); 
    
    const [eventData, setEventData] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const data = await eventService.getEventById(id);
                // Security Check inside the fetch to ensure we have data first
                if (!isAdmin && data.createdBy !== currentUser?.uid) {
                    navigate('/events'); 
                    return;
                }
                setEventData(data);
            } catch (error) {
                console.error("Error fetching event:", error);
                navigate('/events');
            } finally {
                setLoadingData(false);
            }
        };

        // Only fetch if we are sure auth has resolved
        if (userRole !== undefined) {
             fetchEvent();
        }
    }, [id, currentUser, isAdmin, userRole, navigate]);

    // THE FIX: Wait until auth has resolved before checking roles
    if (userRole === undefined) return <div dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>טוען נתוני משתמש...</div>;
    
    if (userRole !== 'coordinator' && userRole !== 'admin') {
        return (
            <div dir="rtl" className="error-screen">
                <h2>שגיאת הרשאה</h2>
                <p>אין לך גישה לעמוד זה. (Access Denied)</p>
                <button onClick={() => navigate('/')} className="btn-primary pill-btn">חזרה לדף הבית</button>
            </div>
        );
    }

    if (loadingData) return <div dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>טוען נתוני אירוע...</div>;

    return (
        <div className="flat-page-wrapper" dir="rtl">
            <div className="flat-header">
                <h1>עריכת אירוע</h1>
                <p>עדכן את פרטי האירוע מטה.</p>
            </div>
            <EventForm 
                initialData={eventData} 
                isEditMode={true}
                onSuccess={() => navigate('/events')} 
                onCancel={() => navigate(-1)}         
            />
        </div>
    );
};

export default EditEventPage;