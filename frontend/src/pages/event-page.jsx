import React, { useState, useEffect } from 'react';
import { EventsCarousel } from '../features/carousel/event-carousel';
import { MiniCalendar } from '../features/calendar/mini-calendar'; 

export const EventsPage = () => {
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We simulate an API call to fetch events. 
        // Later, this will be replaced with fetchEvents() from our service layer.
        const mockEvents = [
            {
                id: '1',
                title: 'אירוע השבוע: כנס מעסיקים - מרכז העיר',
                description: 'הצטרפו אלינו לכנס השנתי הגדול של מעסיקי ירושלים. בתוכנית: נטוורקינג ועדכונים על מענקי תעסוקה.',
                date: '20.06.2026',
                location: 'בנייני האומה, ירושלים',
                imageUrl: ''
            },
            {
                id: '2',
                title: 'סדנת שילוב עובדים מגוונים',
                description: 'סדנה מעשית למנהלי משאבי אנוש בנושא יצירת סביבת עבודה מכילה.',
                date: '25.06.2026',
                location: 'זום (אונליין)',
                imageUrl: ''
            }
        ];

        setUpcomingEvents(mockEvents);
        setLoading(false);
    }, []);

    if (loading) return <div>טוען אירועים...</div>;

    return (
        <div className="events-page-container min-h-screen bg-gray-50 p-8">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-blue-900">לוח אירועים ומפגשים</h1>
                <p className="text-gray-600 mt-2">הישארו מעודכנים בכל הכנסים, הסדנאות והמפגשים של מנהלת התעסוקה</p>
            </header>

            {/* Top Section: High-priority events carousel */}
            <section className="carousel-section mb-12">
                <EventsCarousel events={upcomingEvents} />
            </section>

            {/* Bottom Section: Full monthly view */}
            <section className="calendar-section max-w-4xl mx-auto bg-white p-6 rounded shadow">
                <h3 className="text-xl font-bold mb-4 border-b pb-2">תצוגת יומן חודשית</h3>
                { 
                  <MiniCalendar events={upcomingEvents} /> 
                }
                <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400">
                    [רכיב יומן עתידי ימוקם כאן]
                </div>
            </section>
        </div>
    );
};