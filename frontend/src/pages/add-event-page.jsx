import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { EventForm } from '../components/events/event-form'; 

export const AddEventPage = () => {
    const navigate = useNavigate();
    const { userRole, isAdmin } = useAuth();

    // Security Check
    if (userRole !== 'coordinator' && userRole !== 'admin') {
        return (
            <div dir="rtl" className="error-screen">
                <h2>שגיאת הרשאה</h2>
                <p>אין לך גישה לעמוד זה. (Access Denied)</p>
                {/* Fixed Button Class */}
                <button onClick={() => navigate('/')} className="btn-primary">חזרה לדף הבית</button>
            </div>
        );
    }

    return (
        /* Fixed: Using the Global Modern Wrapper */
        <div className="modern-layout-wrapper" dir="rtl">
            
            {/* Fixed: Using the Global Rich Header */}
            <div className="page-header-rich">
                <div className="page-header-content">
                    <h1>{isAdmin ? 'פרסום אירוע חדש' : 'בקשה לפרסום אירוע'}</h1>
                    <p>מלאו את הפרטים מטה כדי להוסיף פעילות חדשה למערכת</p>
                </div>
            </div>

            {/* Fixed: Using the Global Floating Card */}
            <div className="floating-content-card">
                <EventForm 
                    onSuccess={() => navigate('/events')} 
                    onCancel={() => navigate(-1)}         
                />
            </div>

        </div>
    );
};

export default AddEventPage;