import React, { useState } from 'react';

/**
 * MiniCalendar renders a basic monthly view and highlights days with upcoming events.
 * Following SRP: Its sole responsibility is visual representation of dates, isolating it from data fetching logic.
 * 
 * @param {Object} props - Component properties.
 * @param {Array} props.events - List of events to calculate which days need markers.
 */
export const MiniCalendar = ({ events }) => {
    // We initialize the calendar to the current date.
    const [currentDate, setCurrentDate] = useState(new Date());

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Calculate the number of days in the current month to generate the grid.
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Determine the starting day of the week (0 = Sunday, 1 = Monday, etc.) to offset the first row.
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    /**
     * Checks if a specific day in the current month has any scheduled events.
     * We use this to render a visual indicator (like a dot) under the date.
     * 
     * @param {number} day - The day of the month to check.
     * @returns {boolean} - True if an event exists on this day.
     */
    const hasEventOnDay = (day) => {
        if (!events) return false;
        
        // Format the current calendar day to match the event date format (DD.MM.YYYY)
        const formattedDay = `${String(day).padStart(2, '0')}.${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;
        return events.some(event => event.date === formattedDay);
    };

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Generate an array of empty slots for the days before the 1st of the month.
    const emptySlots = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    // Generate an array for the actual days of the month.
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

    return (
        <div className="mini-calendar w-full max-w-md mx-auto bg-white border rounded-lg shadow p-4" dir="rtl">
            {/* Calendar Header: Navigation and Current Month/Year */}
            <div className="calendar-header flex justify-between items-center mb-4">
                <button onClick={handleNextMonth} className="text-blue-800 font-bold hover:bg-gray-100 p-2 rounded">&lt;</button>
                <h4 className="text-lg font-bold text-gray-700">
                    {monthNames[currentMonth]} {currentYear}
                </h4>
                <button onClick={handlePreviousMonth} className="text-blue-800 font-bold hover:bg-gray-100 p-2 rounded">&gt;</button>
            </div>

            {/* Days of the Week Row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-semibold text-gray-500">
                {dayNames.map(day => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {emptySlots.map(slot => (
                    <div key={`empty-${slot}`} className="p-2 text-gray-300"></div>
                ))}
                
                {daysArray.map(day => (
                    <div 
                        key={day} 
                        className="p-2 relative flex flex-col items-center justify-center rounded hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                        <span className="text-gray-800">{day}</span>
                        {/* Render a small blue dot if there's an event on this day */}
                        {hasEventOnDay(day) && (
                            <span className="absolute bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};