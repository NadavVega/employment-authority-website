import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { eventService } from '../../services/interfaces/event-services'; 
import '../../design/event-page-design.css'; 

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons in Vite/React
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const JERUSALEM_COORDS = { lat: 31.7683, lng: 35.2137 };

export const EventForm = ({ onSuccess, onCancel }) => {
    const { currentUser, userRole, isAdmin } = useAuth();
    if (userRole !== 'coordinator' && userRole !== 'admin') return null;

    // --- GENERAL UI STATE ---
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // --- MAP STATE ---
    const [mapPosition, setMapPosition] = useState(JERUSALEM_COORDS);
    const [isLocating, setIsLocating] = useState(false);
    const [isSearching, setIsSearching] = useState(false); 

    // --- FORM DATA STATE ---
    const [formData, setFormData] = useState({
        title: '', type: 'הכשרה', date: '', startTime: '', endTime: '', location: '', capacity: '', description: '', coordinatorPhone: '',
        isAccessible: false, accessibilityContactName: '', accessibilityContactPhone: '',
        isPaid: false, price: '', discountDetails: '', paymentLink: ''
    });

    // ==========================================
    // MAP & GEOCODING LOGIC
    // ==========================================

    // 1. REVERSE GEOCODING (Map Click -> Text Address)
    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'he' }
            });
            const data = await response.json();
            if (data && data.display_name) {
                const shortAddress = data.display_name.split(',').slice(0, 3).join(',');
                setFormData(prev => ({ ...prev, location: shortAddress }));
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

    // 2. FORWARD GEOCODING (Text Address -> Map Pin)
    const handleAddressSearch = async () => {
        if (!formData.location) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location)}&limit=1`, {
                headers: { 'Accept-Language': 'he' }
            });
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setMapPosition({ lat, lng }); 
            } else {
                alert("לא מצאנו את הכתובת. נסה להוסיף את שם העיר (לדוגמה: 'יפו 33, ירושלים').");
            }
        } catch (error) {
            console.error("Geocoding search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // 3. MAP CAMERA UPDATER (Forces map to "fly" to new coordinates)
    const MapCameraUpdater = ({ center }) => {
        const map = useMap();
        useEffect(() => {
            if (center) map.flyTo(center, 15, { duration: 1.5 }); 
        }, [center, map]);
        return null;
    };

    // 4. MAP CLICK HANDLER
    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setMapPosition({ lat, lng });
                fetchAddress(lat, lng);
            },
        });
        return mapPosition ? <Marker position={mapPosition} icon={markerIcon} /> : null;
    };

    // 5. GPS LOCATION HANDLER
    const handleGetGPS = () => {
        setIsLocating(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setMapPosition({ lat, lng });
                    fetchAddress(lat, lng);
                    setIsLocating(false);
                },
                () => { alert("שגיאה. ודא שאישרת גישה למיקום."); setIsLocating(false); }
            );
        } else {
            alert("הדפדפן שלך אינו תומך בשירותי מיקום.");
            setIsLocating(false);
        }
    };

    // ==========================================
    // STANDARD FORM LOGIC
    // ==========================================

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

const handleSubmit = async (e) => {
        // This proves the Javascript actually fired
        console.log(" SUBMIT TRIGGERED! Bypassing browser validation..."); 

        e.preventDefault();
        setIsLoading(true); 
        setErrorMsg('');

        try {
            const formattedData = { 
                ...formData, 
                time: `${formData.endTime}-${formData.startTime}` 
            };

            const result = await eventService.createEvent(formattedData, currentUser, userRole);
            
            alert(result.status === 'published' ? 'האירוע פורסם בהצלחה!' : 'האירוע נשלח לאישור מנהלת.');
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Firebase Error:", error); // Prints the exact DB error if one happens
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="event-form-container" dir="rtl">
            {errorMsg && <div className="error-alert">{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="event-form">
                
                {/* --- 1. MANDATORY DETAILS --- */}
                <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>פרטי האירוע (חובה)</h4>
                
                <div className="form-group">
                    <label>כותרת האירוע *</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="input-standard" />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>סוג אירוע *</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="input-standard">
                            <option value="הכשרה">הכשרה</option>
                            <option value="יום קריירה">יום קריירה</option>
                            <option value="ירידת עבודה">ירידת עבודה</option>
                            <option value="סדנה">סדנה</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>כמות משתתפים *</label>
                        <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required className="input-standard" min="1" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                        <label>תאריך *</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="input-standard" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>התחלה *</label>
                        <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="input-standard" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>סיום *</label>
                        <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="input-standard" />
                    </div>
                </div>

                {/* --- 2. MAP SECTION --- */}
                <div className="form-group" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                        <label style={{ margin: 0 }}>מיקום (הקלד כתובת או בחר במפה) *</label>
                        <button type="button" onClick={handleGetGPS} disabled={isLocating} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                            {isLocating ? 'מחפש...' : '📍 השתמש במיקום שלי'}
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input 
                            type="text" 
                            name="location" 
                            value={formData.location} 
                            onChange={handleChange} 
                            required 
                            className="input-standard" 
                            placeholder="לדוגמה: יפו 33, ירושלים" 
                            style={{ flex: 1 }} 
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                        />
                        <button 
                            type="button" 
                            onClick={handleAddressSearch} 
                            className="btn-primary" 
                            disabled={isSearching}
                            style={{ padding: '0 20px' }}
                        >
                            {isSearching ? '...' : 'חפש'}
                        </button>
                    </div>
                    
                    <div style={{ height: '250px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 1 }}>
                        <MapContainer center={mapPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <MapCameraUpdater center={mapPosition} />
                            <MapClickHandler />
                        </MapContainer>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>* לחץ "חפש" כדי להציג את הכתובת על המפה, או לחץ על המפה כדי לבחור ידנית.</p>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>תיאור קצר *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows="3" className="input-standard"></textarea>
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>טלפון רכז אחראי *</label>
                    <input type="tel" name="coordinatorPhone" value={formData.coordinatorPhone} onChange={handleChange} required className="input-standard" />
                </div>

                {/* --- 3. ACCESSIBILITY --- */}
                <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginTop: '32px' }}>נגישות</h4>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" name="isAccessible" checked={formData.isAccessible} onChange={handleChange} id="accessibility-toggle" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="accessibility-toggle" style={{ margin: 0, cursor: 'pointer' }}>אירוע מונגש לבעלי מוגבלויות</label>
                </div>
                {formData.isAccessible && (
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>שם איש קשר *</label>
                            <input type="text" name="accessibilityContactName" value={formData.accessibilityContactName} onChange={handleChange} required className="input-standard" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>טלפון *</label>
                            <input type="tel" name="accessibilityContactPhone" value={formData.accessibilityContactPhone} onChange={handleChange} required className="input-standard" />
                        </div>
                    </div>
                )}

                {/* --- 4. PAYMENT --- */}
                <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginTop: '32px' }}>תשלום</h4>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} id="payment-toggle" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="payment-toggle" style={{ margin: 0, cursor: 'pointer' }}>אירוע בתשלום</label>
                </div>
                {formData.isPaid && (
                    <div style={{ marginTop: '10px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <div className="form-group">
                            <label>עלות משתתף (₪) *</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} required className="input-standard" style={{ width: '150px' }} min="0" />
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                            <label>הנחות וזכאויות</label>
                            <textarea name="discountDetails" value={formData.discountDetails} onChange={handleChange} rows="2" className="input-standard" placeholder="לדוגמה: 50% הנחה לאזרחים ותיקים"></textarea>
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                            <label>לינק לתשלום</label>
                            <input type="url" name="paymentLink" value={formData.paymentLink} onChange={handleChange} className="input-standard" />
                        </div>
                    </div>
                )}

                {/* --- 5. MEDIA (URL LINKS ONLY) --- */}
                <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginTop: '32px' }}>מדיה מומלצת (אופציונלי)</h4>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>לינק לתמונה / פלייר (URL)</label>
                        <input 
                            type="url" 
                            name="photoUrl" 
                            value={formData.photoUrl || ''} 
                            onChange={handleChange} 
                            className="input-standard" 
                            placeholder="https://..." 
                        />
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>הדבק קישור לתמונה (Google Drive, פייסבוק וכו')</p>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>לינק ללוגו המרכז (URL)</label>
                        <input 
                            type="url" 
                            name="logoUrl" 
                            value={formData.logoUrl || ''} 
                            onChange={handleChange} 
                            className="input-standard" 
                            placeholder="https://..." 
                        />
                    </div>
                </div>

                {/* --- 6. SUBMIT BUTTONS --- */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    <button type="button" onClick={onCancel} className="btn-secondary" disabled={isLoading}>
                        ביטול
                    </button>
                    <button type="submit" className="btn-primary" disabled={isLoading} formNoValidate>
                        {isLoading ? 'טוען...' : (isAdmin ? 'פירסום אירוע' : 'שליחה לאישור מנהלת')}
                    </button>
                </div>

            </form>
        </div>
    );
};