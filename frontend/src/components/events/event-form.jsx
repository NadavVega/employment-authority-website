import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { eventService } from '../../services/interfaces/event-services'; 
import '../../design/event-page-design.css'; 

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const JERUSALEM_COORDS = { lat: 31.7683, lng: 35.2137 };
const ISRAELI_PREFIXES = ['050', '051', '052', '053', '054', '055', '058', '059', '02', '03', '04', '08', '09', '072', '073', '077'];

export const EventForm = ({ onSuccess, onCancel }) => {
    const { currentUser, userRole, isAdmin } = useAuth();
    if (userRole !== 'coordinator' && userRole !== 'admin') return null;

    // --- GENERAL UI STATE ---
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    // --- MAP STATE (MODAL LOGIC) ---
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [showMapConfirm, setShowMapConfirm] = useState(false);
    const [pendingMapPosition, setPendingMapPosition] = useState(JERUSALEM_COORDS);
    const [pendingLocationText, setPendingLocationText] = useState('');
    const [isSearching, setIsSearching] = useState(false); 

    // --- FORM DATA STATE ---
    const [formData, setFormData] = useState({
        title: '', type: '', date: '', startTime: '', endTime: '', location: '', capacity: '', description: '',
        isAccessible: false, accessibilityContactName: '',
        photoUrl: '', logoUrl: '', paymentLink: '' // Restored optional fields
    });

    // --- DYNAMIC PHONE ARRAYS ---
    const [coordinatorPhones, setCoordinatorPhones] = useState([{ prefix: '050', number: '' }]);
    const [accessibilityPhones, setAccessibilityPhones] = useState([{ prefix: '050', number: '' }]);

    // ==========================================
    // MAP & GEOCODING LOGIC 
    // ==========================================

    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'he' }
            });
            const data = await response.json();
            if (data && data.display_name) {
                const shortAddress = data.display_name.split(',').slice(0, 3).join(',');
                setPendingLocationText(shortAddress);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

    const handleAddressSearch = async () => {
        if (!pendingLocationText) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pendingLocationText)}&limit=1`, {
                headers: { 'Accept-Language': 'he' }
            });
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setPendingMapPosition({ lat, lng }); 
            } else {
                alert("לא מצאנו את הכתובת. נסה להוסיף את שם העיר.");
            }
        } finally {
            setIsSearching(false);
        }
    };

    const MapCameraUpdater = ({ center }) => {
        const map = useMap();
        useEffect(() => { if (center) map.flyTo(center, 15, { duration: 1.5 }); }, [center, map]);
        return null;
    };

    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setPendingMapPosition({ lat, lng });
                fetchAddress(lat, lng);
            },
        });
        return pendingMapPosition ? <Marker position={pendingMapPosition} icon={markerIcon} /> : null;
    };

    // --- MAP UI ACTIONS ---
    const openMap = () => {
        setPendingLocationText(formData.location);
        setIsMapExpanded(true);
    };

    const closeMapAttempt = () => {
        if (pendingLocationText && pendingLocationText !== formData.location) {
            setShowMapConfirm(true); 
        } else {
            setIsMapExpanded(false);
        }
    };

    const confirmMapSelection = () => {
        setFormData(prev => ({ ...prev, location: pendingLocationText }));
        setIsMapExpanded(false);
        setShowMapConfirm(false);
    };

    const rejectMapSelection = () => {
        setShowMapConfirm(false);
        setIsMapExpanded(false);
        setPendingLocationText(formData.location); 
    };

    // ==========================================
    // VALIDATION & SUBMIT LOGIC
    // ==========================================

    const validateForm = () => {
        let newErrors = {};
        const nameRegex = /^[a-zA-Zא-ת\s]+$/;
        const phoneRegex = /^\d{7}$/;

        // 1. Mandatory Fields Check (Added 'type' to the required list)
        ['title', 'type', 'date', 'startTime', 'endTime', 'location', 'capacity', 'description'].forEach(field => {
            if (!formData[field]) newErrors[field] = 'שדה זה הוא חובה';
        });

        // 2. Phone Validations
        coordinatorPhones.forEach((phone, idx) => {
            if (!phoneRegex.test(phone.number)) {
                newErrors[`coordPhone_${idx}`] = 'נא להזין 7 ספרות בדיוק';
            }
        });

        // 3. Accessibility Validations 
        if (formData.isAccessible) {
            if (!formData.accessibilityContactName || !nameRegex.test(formData.accessibilityContactName)) {
                newErrors.accName = 'נא להזין שם תקין (אותיות ורווחים בלבד)';
            }
            accessibilityPhones.forEach((phone, idx) => {
                if (!phoneRegex.test(phone.number)) {
                    newErrors[`accPhone_${idx}`] = 'נא להזין 7 ספרות בדיוק';
                }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return; 

        setIsLoading(true); 

        try {
            const combinedCoordPhones = coordinatorPhones.map(p => `${p.prefix}-${p.number}`).join(', ');
            const combinedAccPhones = formData.isAccessible ? accessibilityPhones.map(p => `${p.prefix}-${p.number}`).join(', ') : '';

            const formattedData = { 
                ...formData, 
                time: `${formData.endTime}-${formData.startTime}`,
                coordinatorPhone: combinedCoordPhones,
                accessibilityContactPhone: combinedAccPhones
            };

            const result = await eventService.createEvent(formattedData, currentUser, userRole);
            alert(result.status === 'published' ? 'האירוע פורסם בהצלחה!' : 'האירוע נשלח לאישור מנהלת.');
            if (onSuccess) onSuccess();

        } catch (error) {
            setErrors({ global: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const renderPhoneInputs = (phoneArray, setPhoneArray, errorPrefix) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {phoneArray.map((phone, index) => (
                <div key={index}>
                    {/* ADDED dir="ltr" to properly display prefixes like an Israeli phone number */}
                    <div className={`phone-split-input ${errors[`${errorPrefix}_${index}`] ? 'error-border' : ''}`} dir="ltr">
                        <select 
                            value={phone.prefix} 
                            onChange={(e) => {
                                const newPhones = [...phoneArray];
                                newPhones[index].prefix = e.target.value;
                                setPhoneArray(newPhones);
                            }}
                            className="phone-prefix"
                        >
                            {ISRAELI_PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input 
                            type="text" 
                            maxLength="7"
                            value={phone.number}
                            onChange={(e) => {
                                const newPhones = [...phoneArray];
                                newPhones[index].number = e.target.value.replace(/\D/g, '');
                                setPhoneArray(newPhones);
                            }}
                            className="phone-suffix"
                            style={{ textAlign: 'left' }}
                        />
                        {phoneArray.length > 1 && (
                            <button type="button" onClick={() => setPhoneArray(phoneArray.filter((_, i) => i !== index))} className="btn-remove-phone">✖</button>
                        )}
                    </div>
                    {errors[`${errorPrefix}_${index}`] && <span className="error-text">{errors[`${errorPrefix}_${index}`]}</span>}
                </div>
            ))}
            <button type="button" onClick={() => setPhoneArray([...phoneArray, { prefix: '050', number: '' }])} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}>
                + הוסף מספר נוסף
            </button>
        </div>
    );

    // Reusable trigger for opening native date/time pickers by clicking anywhere on the input
    const triggerPicker = (e) => {
        if (e.target.showPicker) {
            e.target.showPicker();
        }
    };

    return (
        <div className="event-form-container form-contrast-wrapper" dir="rtl">
            {errors.global && <div className="error-alert">{errors.global}</div>}

            <form onSubmit={handleSubmit} className="event-form" noValidate>
                
                {/* --- 1. MANDATORY DETAILS --- */}
                <h4 className="section-title">פרטי האירוע (חובה)</h4>
                
                <div className="form-group">
                    <label>כותרת האירוע *</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={`input-standard ${errors.title ? 'error-border' : ''}`} />
                    {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>סוג אירוע *</label>
                        <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className={`input-standard ${errors.type ? 'error-border' : ''}`}>
                            <option value="" disabled hidden>בחר סוג אירוע</option>
                            <option value="הכשרה">הכשרה</option>
                            <option value="יום קריירה">יום קריירה</option>
                            <option value="ירידת עבודה">ירידת עבודה</option>
                            <option value="סדנה">סדנה</option>
                        </select>
                        {errors.type && <span className="error-text">{errors.type}</span>}
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>כמות משתתפים *</label>
                        <input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} className={`input-standard ${errors.capacity ? 'error-border' : ''}`} min="1" />
                        {errors.capacity && <span className="error-text">{errors.capacity}</span>}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                        <label>תאריך *</label>
                        <input type="date" value={formData.date} onClick={triggerPicker} onChange={(e) => setFormData({...formData, date: e.target.value})} className={`input-standard ${errors.date ? 'error-border' : ''}`} />
                        {errors.date && <span className="error-text">{errors.date}</span>}
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>התחלה *</label>
                        <input type="time" value={formData.startTime} onClick={triggerPicker} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className={`input-standard ${errors.startTime ? 'error-border' : ''}`} />
                        {errors.startTime && <span className="error-text">{errors.startTime}</span>}
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>סיום *</label>
                        <input type="time" value={formData.endTime} onClick={triggerPicker} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className={`input-standard ${errors.endTime ? 'error-border' : ''}`} />
                        {errors.endTime && <span className="error-text">{errors.endTime}</span>}
                    </div>
                </div>

                {/* --- 2. LOCATION TRIGGER --- */}
                <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>מיקום *</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="text" readOnly value={formData.location} placeholder="טרם נבחר מיקום" className={`input-standard ${errors.location ? 'error-border' : ''}`} onClick={openMap} style={{ cursor: 'pointer', flex: 1 }} />
                        <button type="button" onClick={openMap} className="btn-secondary">🗺️ פתח מפה</button>
                    </div>
                    {errors.location && <span className="error-text">{errors.location}</span>}
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>תיאור קצר *</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" className={`input-standard ${errors.description ? 'error-border' : ''}`}></textarea>
                    {errors.description && <span className="error-text">{errors.description}</span>}
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>טלפון רכז אחראי *</label>
                    {renderPhoneInputs(coordinatorPhones, setCoordinatorPhones, 'coordPhone')}
                </div>

                {/* --- 3. ACCESSIBILITY --- */}
                <h4 className="section-title" style={{ marginTop: '32px' }}>נגישות</h4>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={formData.isAccessible} onChange={(e) => setFormData({...formData, isAccessible: e.target.checked})} id="accessibility-toggle" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="accessibility-toggle" style={{ margin: 0, cursor: 'pointer' }}>אירוע מונגש לבעלי מוגבלויות</label>
                </div>
                {formData.isAccessible && (
                    <div className="accessibility-panel">
                        <div className="form-group">
                            <label>שם איש קשר *</label>
                            <input type="text" value={formData.accessibilityContactName} onChange={(e) => setFormData({...formData, accessibilityContactName: e.target.value})} className={`input-standard ${errors.accName ? 'error-border' : ''}`} />
                            {errors.accName && <span className="error-text">{errors.accName}</span>}
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                            <label>טלפון איש קשר *</label>
                            {renderPhoneInputs(accessibilityPhones, setAccessibilityPhones, 'accPhone')}
                        </div>
                    </div>
                )}

                {/* --- 4. OPTIONAL DETAILS (RESTORED) --- */}
                <h4 className="section-title" style={{ marginTop: '32px' }}>פרטים נוספים (רשות)</h4>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>קישור לתמונה (Photo URL)</label>
                        <input type="url" value={formData.photoUrl} onChange={(e) => setFormData({...formData, photoUrl: e.target.value})} className="input-standard" placeholder="https://..." />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>קישור ללוגו (Logo URL)</label>
                        <input type="url" value={formData.logoUrl} onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} className="input-standard" placeholder="https://..." />
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label>קישור הרשמה / תשלום חיצוני</label>
                    <input type="url" value={formData.paymentLink} onChange={(e) => setFormData({...formData, paymentLink: e.target.value})} className="input-standard" placeholder="https://..." />
                </div>

                {/* --- 5. SUBMIT BUTTONS --- */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    <button type="button" onClick={onCancel} className="btn-secondary" disabled={isLoading}>ביטול</button>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'טוען...' : (isAdmin ? 'פירסום אירוע' : 'שליחה לאישור מנהלת')}
                    </button>
                </div>
            </form>

            {/* MAP MODAL (Unchanged) */}
            {isMapExpanded && (
                <div className="event-modal-overlay">
                    {/* ... Map logic here remains the same ... */}
                    <div className="event-modal-content map-modal-custom">
                        <button className="event-modal-close" onClick={closeMapAttempt}>✖</button>
                        
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--color-primary-dark)' }}>בחירת מיקום</h3>
                        
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input 
                                type="text" 
                                value={pendingLocationText} 
                                onChange={(e) => setPendingLocationText(e.target.value)} 
                                className="input-standard" 
                                placeholder="חפש כתובת (לדוגמה: יפו 33, ירושלים)" 
                                style={{ flex: 1 }} 
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSearch(); }}
                            />
                            <button type="button" onClick={handleAddressSearch} className="btn-secondary" disabled={isSearching}>
                                {isSearching ? '...' : 'חיפוש'}
                            </button>
                        </div>

                        <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 1 }}>
                            <MapContainer center={pendingMapPosition} zoom={14} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapCameraUpdater center={pendingMapPosition} />
                                <MapClickHandler />
                            </MapContainer>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>* לחץ על המפה כדי לבחור מיקום ידנית.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={closeMapAttempt} className="btn-secondary">סגירה</button>
                                <button type="button" onClick={confirmMapSelection} className="btn-primary">אישור</button>
                            </div>
                        </div>

                        {/* SECONDARY CONFIRMATION DIALOG INSIDE MAP */}
                        {showMapConfirm && (
                            <div className="validation-dialog-overlay">
                                <div className="validation-dialog-box">
                                    <h4>להשתמש במיקום הנבחר?</h4>
                                    <p>בחרת כתובת חדשה, האם תרצה לשמור אותה לאירוע?</p>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                        <button onClick={rejectMapSelection} className="btn-secondary">לא, בטל שינויים</button>
                                        <button onClick={confirmMapSelection} className="btn-primary">כן, אשר מיקום</button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};