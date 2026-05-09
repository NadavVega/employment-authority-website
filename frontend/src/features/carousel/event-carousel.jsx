import React, { useState } from 'react';
import { useAuth } from '../../context/auth-context';

/**
 * EventsCarousel displays a slider of upcoming events.
 * It handles the navigation logic and conditional rendering for the registration button based on user role.
 */
export const EventsCarousel = ({ events }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { isGuest, isEmployer } = useAuth();

    // We return early if there are no events to prevent rendering errors.
    if (!events || events.length === 0) {
        return <div className="text-center p-4">אין אירועים קרובים החודש.</div>;
    }

    const currentEvent = events[currentIndex];

    const handleNext = () => {
        // We use modulo to create a continuous loop when clicking next.
        setCurrentIndex((prevIndex) => (prevIndex + 1) % events.length);
    };

    const handlePrev = () => {
        // We add the array length before applying modulo to handle negative indices safely.
        setCurrentIndex((prevIndex) => (prevIndex - 1 + events.length) % events.length);
    };

    return (
        <div className="carousel-container border rounded shadow-lg overflow-hidden w-full max-w-4xl mx-auto my-6">
            {/* Top part: Image Placeholder */}
            <div className="image-placeholder bg-gray-100 h-64 flex items-center justify-center relative">
                <button onClick={handlePrev} className="absolute left-4 text-2xl font-bold p-2">&lt;</button>
                <img 
                    src={currentEvent.imageUrl || '/default-event.jpg'} 
                    alt={currentEvent.title} 
                    className="h-full object-cover"
                />
                <button onClick={handleNext} className="absolute right-4 text-2xl font-bold p-2">&gt;</button>
            </div>

            {/* Bottom part: Details (Blue box styling based on your image) */}
            <div className="details-section bg-blue-800 text-white p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">{currentEvent.title}</h2>
                <p className="mb-4">{currentEvent.description}</p>
                <div className="event-meta text-sm mb-4">
                    <span>תאריך: {currentEvent.date}</span> | <span>מיקום: {currentEvent.location}</span>
                </div>

                {/* Role-based Access Control for Registration */}
                {!isGuest ? (
                    <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded">
                        הירשם עכשיו
                    </button>
                ) : (
                    <p className="text-sm text-gray-300">
                        כדי להירשם לאירוע, אנא <a href="/login" className="underline">התחבר למערכת</a>.
                    </p>
                )}

                {/* Dots indicator */}
                <div className="flex justify-center mt-4 space-x-2 space-x-reverse">
                    {events.map((_, index) => (
                        <span 
                            key={index} 
                            className={`h-3 w-3 rounded-full ${index === currentIndex ? 'bg-yellow-500' : 'bg-gray-400'}`}
                        ></span>
                    ))}
                </div>
            </div>
        </div>
    );
};