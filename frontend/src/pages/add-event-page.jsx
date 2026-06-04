import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { EventForm } from '../components/events/event-form'; 
import '../design/event-form.css';

export const AddEventPage = () => {
    const navigate = useNavigate();
    const { userRole, isAdmin } = useAuth();

    if (userRole === undefined) return <div dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>טוען נתוני משתמש...</div>;

    if (userRole !== 'coordinator' && userRole !== 'admin') {
        return (
            <div dir="rtl" className="error-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                <h2>שגיאת הרשאה</h2>
                <p>אין לך גישה לעמוד זה.</p>
                <button onClick={() => navigate('/')} className="btn-primary pill-btn">חזרה לדף הבית</button>
            </div>
        );
    }

    return (
        <div className="flat-page-wrapper" dir="rtl">
            <div className="flat-header">
                {/* CHANGED: Always show "Publish New Event" */}
                <h1>פרסום אירוע חדש</h1>
                <p>מלאו את הפרטים מטה כדי להוסיף פעילות חדשה למערכת</p>
            </div>
            <EventForm onSuccess={() => navigate('/events')} onCancel={() => navigate('/events')} />
        </div>
    );
};

export default AddEventPage;