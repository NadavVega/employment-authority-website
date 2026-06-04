import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { eventService } from '../../services/interfaces/event-services'; 

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from '../../services/firebase/config'; 

import '../../design/event-page.css'; 

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

const parsePhoneString = (phoneStr) => {
    if (!phoneStr) return [{ prefix: '050', number: '' }];
    return phoneStr.split(', ').map(p => {
        const [prefix, number] = p.split('-');
        return { prefix: prefix || '050', number: number || '' };
    });
};

export const EventForm = ({ initialData, isEditMode = false, onSuccess, onCancel }) => {
    const { currentUser, userRole, isAdmin } = useAuth();
    
    if (userRole !== 'coordinator' && userRole !== 'admin') return null;

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [showPriceWarning, setShowPriceWarning] = useState(false);
    const [priceWarningAccepted, setPriceWarningAccepted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [pendingMapPosition, setPendingMapPosition] = useState(JERUSALEM_COORDS);
    const [pendingLocationText, setPendingLocationText] = useState('');
    const [isSearching, setIsSearching] = useState(false); 

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('idle'); 

    const [isCapacityUnlimited, setIsCapacityUnlimited] = useState(false);

    const [formData, setFormData] = useState({
        title: '', type: '', date: '', startTime: '', endTime: '', location: '', capacity: '', description: '',
        isAccessible: false, accessibilityContactName: '',
        paymentMethod: 'none', price: '', discountDetails: '', paymentDetails: '', 
        photoUrl: '', logoUrl: '' 
    });

    const [coordinatorPhones, setCoordinatorPhones] = useState([{ prefix: '050', number: '' }]);
    const [accessibilityPhones, setAccessibilityPhones] = useState([{ prefix: '050', number: '' }]);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isEditMode && initialData) {
            setFormData({
                ...initialData,
                date: initialData.date?.toDate ? initialData.date.toDate().toISOString().split('T')[0] : (initialData.date || ''),
                startTime: initialData.time ? initialData.time.split('-')[0] : '',
                endTime: initialData.time ? initialData.time.split('-')[1] : '',
            });
            setIsCapacityUnlimited(!initialData.capacity || initialData.capacity === 'ללא הגבלה');
            setCoordinatorPhones(parsePhoneString(initialData.coordinatorPhone));
            if (initialData.isAccessible) {
                setAccessibilityPhones(parsePhoneString(initialData.accessibilityContactPhone));
            }
        }
    }, [isEditMode, initialData]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('נא להעלות קובץ תמונה בלבד');
            return;
        }

        const uniqueFileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `event_images/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        setIsUploading(true);
        setUploadStatus('uploading');

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            }, 
            (error) => {
                console.error("Upload Error:", error);
                setUploadStatus('error');
                setIsUploading(false);
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setFormData(prev => ({ ...prev, photoUrl: downloadURL }));
                setUploadStatus('success');
                setIsUploading(false);
                setUploadProgress(0);
            }
        );
    };

    const calculateTimeDifference = (start, end) => {
        if (!start || !end) return 0;
        const [sHours, sMins] = start.split(':').map(Number);
        const [eHours, eMins] = end.split(':').map(Number);
        return (eHours * 60 + eMins) - (sHours * 60 + sMins);
    };

    const handlePriceBlur = (e) => {
        const val = Number(e.target.value);
        if (val > 1000 && !priceWarningAccepted) {
            setShowPriceWarning(true);
        }
    };

    const handleAddPhone = (phoneArray, setPhoneArray, errorPrefix) => {
        const lastPhone = phoneArray[phoneArray.length - 1];
        if (lastPhone && lastPhone.number.length < 7) {
            setErrors(prev => ({ ...prev, [`${errorPrefix}_${phoneArray.length - 1}`]: 'השלם מספר זה קודם' }));
            return;
        }
        setPhoneArray([...phoneArray, { prefix: '050', number: '' }]);
    };

    const handleAutofillAccessibilityPhone = () => {
        if (coordinatorPhones[0] && coordinatorPhones[0].number.length === 7) {
            setAccessibilityPhones([{ ...coordinatorPhones[0] }]);
        }
    };

    const validateForm = () => {
        let newErrors = {};
        const nameRegex = /^[a-zA-Zא-ת\s]+$/;
        const phoneRegex = /^\d{7}$/;

        ['title', 'type', 'date', 'startTime', 'endTime', 'location', 'description'].forEach(field => {
            if (!formData[field]) newErrors[field] = 'שדה זה הוא חובה';
        });

        if (!isCapacityUnlimited && !formData.capacity) {
            newErrors.capacity = 'שדה זה הוא חובה (או סמן "ללא הגבלה")';
        }

        if (formData.startTime && formData.endTime) {
            const diff = calculateTimeDifference(formData.startTime, formData.endTime);
            if (diff < 30) newErrors.endTime = 'האירוע חייב להיות לפחות 30 דקות';
        }

        const seenPhones = new Set();
        coordinatorPhones.forEach((phone, idx) => {
            const fullPhone = `${phone.prefix}-${phone.number}`;
            if (!phoneRegex.test(phone.number)) newErrors[`coordPhone_${idx}`] = 'נא להזין 7 ספרות בדיוק';
            else if (seenPhones.has(fullPhone)) newErrors[`coordPhone_${idx}`] = 'מספר זה כבר הוזן';
            else seenPhones.add(fullPhone);
        });

        if (formData.isAccessible) {
            if (!formData.accessibilityContactName || !nameRegex.test(formData.accessibilityContactName)) {
                newErrors.accName = 'נא להזין שם תקין (אותיות ורווחים בלבד)';
            }
            accessibilityPhones.forEach((phone, idx) => {
                if (!phoneRegex.test(phone.number)) newErrors[`accPhone_${idx}`] = 'נא להזין 7 ספרות בדיוק';
            });
        }

        if (formData.paymentMethod !== 'none') {
            if (!formData.price || Number(formData.price) < 0) newErrors.price = 'יש להזין מחיר תקין';
            if (formData.paymentMethod === 'other' && !formData.paymentDetails) {
                newErrors.paymentDetails = 'שדה זה הוא חובה';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('שגיאה: ישנם שדות חסרים או לא תקינים. אנא בדוק את ההערות באדום בטופס.');
            return; 
        }

        if (isUploading) {
            alert('אנא המתן לסיום העלאת התמונה');
            return;
        }

        setIsLoading(true); 

        try {
            // 1. Define combined phones FIRST to avoid ReferenceErrors
            const combinedCoordPhones = coordinatorPhones.map(p => `${p.prefix}-${p.number}`).join(', ');
            const combinedAccPhones = formData.isAccessible ? accessibilityPhones.map(p => `${p.prefix}-${p.number}`).join(', ') : '';

            // 2. Build ONE clean formattedData object
            const formattedData = { 
                ...formData, 
                capacity: isCapacityUnlimited ? '' : formData.capacity,
                time: `${formData.startTime}-${formData.endTime}`, 
                coordinatorPhone: combinedCoordPhones,
                accessibilityContactPhone: combinedAccPhones,
                createdBy: currentUser.uid
            };

            // 3. Force status to 'published' for everyone (Admins & Coordinators)
            formattedData.status = 'published';

            // 4. Create a 20-second Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 20000)
            );

            // 5. Create the Database Operation Promise
            const dbOperation = isEditMode
                ? eventService.updateEvent(initialData.id, formattedData)
                : eventService.createEvent(formattedData, currentUser, userRole);

            // 6. Race the Database operation against the Timeout
            await Promise.race([dbOperation, timeoutPromise]);

            // 7. Success Alert - No more "sent to manager" messaging
            alert('האירוע נשמר ופורסם בהצלחה!');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Submit Error:", error);
            setErrors({ global: 'שגיאה בשמירת האירוע: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        // Protect against null initialData 
        if (!initialData || !initialData.id) {
            alert("Error: Cannot delete an event that hasn't fully loaded.");
            setShowDeleteConfirm(false);
            return;
        }

        setIsLoading(true);
        try {
            await eventService.updateEvent(initialData.id, { status: 'deleted' });
            alert('האירוע נמחק בהצלחה.');
            if (onSuccess) onSuccess(); // Triggers the navigation back to /events
        } catch (error) {
            console.error("Failed to delete event:", error);
            setErrors({ global: error.message });
        } finally {
            setIsLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=he`);
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
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pendingLocationText)}&limit=1&accept-language=he`);
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

    const openMap = () => { setIsMapExpanded(true); setPendingLocationText(formData.location); };
    const closeMapAttempt = () => { setIsMapExpanded(false); };
    const confirmMapSelection = () => { setFormData(prev => ({ ...prev, location: pendingLocationText })); setIsMapExpanded(false); };

    const renderPhoneInputs = (phoneArray, setPhoneArray, errorPrefix) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {phoneArray.map((phone, index) => (
                <div key={index}>
                    <div className={`phone-split-input ${errors[`${errorPrefix}_${index}`] ? 'error-border' : ''}`} dir="ltr">
                        <select 
                            value={phone.prefix} 
                            onChange={(e) => {
                                const newPhones = [...phoneArray];
                                newPhones[index].prefix = e.target.value;
                                setPhoneArray(newPhones);
                            }}
                            className="phone-prefix standard-numbers"
                        >
                            {ISRAELI_PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input 
                            type="text" maxLength="7" value={phone.number}
                            onChange={(e) => {
                                const newPhones = [...phoneArray];
                                newPhones[index].number = e.target.value.replace(/\D/g, ''); 
                                setPhoneArray(newPhones);
                            }}
                            className="phone-suffix standard-numbers" style={{ textAlign: 'left' }}
                        />
                        {phoneArray.length > 1 && (
                            <button type="button" onClick={() => setPhoneArray(phoneArray.filter((_, i) => i !== index))} className="btn-remove-phone">✖</button>
                        )}
                    </div>
                    {errors[`${errorPrefix}_${index}`] && <span className="error-text">{errors[`${errorPrefix}_${index}`]}</span>}
                </div>
            ))}
            <button type="button" onClick={() => handleAddPhone(phoneArray, setPhoneArray, errorPrefix)} className="btn-secondary pill-btn" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}>
                + הוסף מספר נוסף
            </button>
        </div>
    );

    return (
        <div className="event-form-container form-contrast-wrapper" dir="rtl" style={{ position: 'relative' }}>
            
            {isLoading && (
                <div className="loading-overlay-full">
                    <div className="spinner"></div>
                    <p>שומר נתונים בשרת, אנא המתן...</p>
                </div>
            )}

            {errors.global && <div className="error-alert">{errors.global}</div>}

            <form onSubmit={handleSubmit} className="event-form" noValidate>
                
                <div className="form-columns-container">
                    
                    <div className="form-column">
                        <h4 className="section-title">פרטי האירוע</h4>
                        
                        <div className="form-group">
                            <label>כותרת האירוע</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={`input-standard ${errors.title ? 'error-border' : ''}`} />
                            {errors.title && <span className="error-text">{errors.title}</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>סוג אירוע</label>
                                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className={`input-standard ${errors.type ? 'error-border' : ''}`}>
                                    <option value="" disabled hidden>בחר סוג אירוע</option>
                                    <option value="הכשרה">הכשרה</option>
                                    <option value="יום קריירה">יום קריירה</option>
                                    <option value="ירידת תעסוקה">ירידת תעסוקה</option>
                                    <option value="סדנה">סדנה</option>
                                </select>
                                {errors.type && <span className="error-text">{errors.type}</span>}
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ margin: 0 }}>כמות משתתפים</label>
                                    <label className="radio-label" style={{ fontSize: '12px', margin: 0 }}>
                                        <input type="checkbox" checked={isCapacityUnlimited} onChange={(e) => { setIsCapacityUnlimited(e.target.checked); setFormData({...formData, capacity: ''}); }} /> ללא הגבלה
                                    </label>
                                </div>
                                <input type="number" dir="ltr" max="1000" min="1" disabled={isCapacityUnlimited} value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value.replace(/\D/g, '')})} className={`input-standard standard-numbers ${errors.capacity ? 'error-border' : ''}`} style={{ backgroundColor: isCapacityUnlimited ? '#f1f5f9' : '#fff' }} />
                                {errors.capacity && <span className="error-text">{errors.capacity}</span>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>תאריך</label>
                                <input type="date" min={todayStr} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className={`input-standard standard-numbers ${errors.date ? 'error-border' : ''}`} />
                                {errors.date && <span className="error-text">{errors.date}</span>}
                            </div>
                            
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>התחלה</label>
                                <input 
                                    type="time" 
                                    step="900" 
                                    value={formData.startTime} 
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})} 
                                    className={`input-standard standard-numbers ${errors.startTime ? 'error-border' : ''}`}
                                    dir="ltr"
                                />
                                {errors.startTime && <span className="error-text">{errors.startTime}</span>}
                            </div>
                            
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>סיום</label>
                                <input 
                                    type="time" 
                                    step="900" 
                                    value={formData.endTime} 
                                    onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
                                    className={`input-standard standard-numbers ${errors.endTime ? 'error-border' : ''}`}
                                    dir="ltr"
                                />  
                                {errors.endTime && <span className="error-text">{errors.endTime}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ margin: 0 }}>מיקום</label>
                                <label className="radio-label" style={{ fontSize: '12px', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isOnline} 
                                        onChange={(e) => setFormData({...formData, isOnline: e.target.checked})} 
                                    /> אירוע מקוון (Zoom / Teams)
                                </label>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    value={formData.location} 
                                    onChange={(e) => setFormData({...formData, location: e.target.value})} 
                                    placeholder={formData.isOnline ? "הכנס קישור לזום/פגישה או כתוב 'מקוון'..." : "הכנס כתובת או בחר במפה..."} 
                                    className={`input-standard ${errors.location ? 'error-border' : ''}`} 
                                    style={{ 
                                        flex: 1, 
                                        direction: formData.isOnline && formData.location.startsWith('http') ? 'ltr' : 'rtl' 
                                    }} 
                                />
                                {!formData.isOnline && (
                                    <button type="button" onClick={openMap} className="btn-secondary pill-btn" style={{ whiteSpace: 'nowrap' }}>
                                        🗺️ פתח מפה
                                    </button>
                                )}
                            </div>
                            {errors.location && <span className="error-text">{errors.location}</span>}
                        </div>

                        <div className="form-group">
                            <label>תיאור קצר</label>
                            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" className={`input-standard ${errors.description ? 'error-border' : ''}`}></textarea>
                            {errors.description && <span className="error-text">{errors.description}</span>}
                        </div>

                        <div className="form-group">
                            <label>טלפון רכז אחראי</label>
                            {renderPhoneInputs(coordinatorPhones, setCoordinatorPhones, 'coordPhone')}
                        </div>
                    </div>

                    <div className="form-column">
                        
                        <h4 className="section-title">נגישות</h4>
                        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={formData.isAccessible} onChange={(e) => setFormData({...formData, isAccessible: e.target.checked})} id="accessibility-toggle" style={{ width: '20px', height: '20px' }} />
                            <label htmlFor="accessibility-toggle" style={{ margin: 0, cursor: 'pointer' }}>אירוע מונגש לבעלי מוגבלויות</label>
                        </div>
                        {formData.isAccessible && (
                            <div className="panel-box" style={{ marginTop: '0' }}>
                                <div className="form-group">
                                    <label>שם איש קשר</label>
                                    <input type="text" value={formData.accessibilityContactName} onChange={(e) => setFormData({...formData, accessibilityContactName: e.target.value})} className={`input-standard ${errors.accName ? 'error-border' : ''}`} />
                                    {errors.accName && <span className="error-text">{errors.accName}</span>}
                                </div>
                                <div className="form-group" style={{ marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label>טלפון איש קשר</label>
                                        <button type="button" className="btn-secondary pill-btn" onClick={handleAutofillAccessibilityPhone} style={{ padding: '4px 12px', fontSize: '12px' }}>
                                            העתק מספר רכז
                                        </button>
                                    </div>
                                    {renderPhoneInputs(accessibilityPhones, setAccessibilityPhones, 'accPhone')}
                                </div>
                            </div>
                        )}

                        <h4 className="section-title" style={{ marginTop: '32px' }}>תשלום והרשמה</h4>
                        <div className="form-group">
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <label className="radio-label">
                                    <input type="radio" value="none" checked={formData.paymentMethod === 'none'} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, price: '', paymentDetails: ''})} /> חינם
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="link" checked={formData.paymentMethod === 'link'} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, paymentDetails: ''})} /> קישור
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="bit" checked={formData.paymentMethod === 'bit'} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, paymentDetails: ''})} /> ביט
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="other" checked={formData.paymentMethod === 'other'} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, paymentDetails: ''})} /> אחר
                                </label>
                            </div>
                        </div>

                        {formData.paymentMethod !== 'none' && (
                            <div className="panel-box" style={{ marginTop: '0' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>מחיר מלא</label>
                                        <input type="number" dir="ltr" min="0" onBlur={handlePriceBlur} value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value.replace(/\D/g, '')})} className={`input-standard standard-numbers ${errors.price ? 'error-border' : ''}`} />
                                        {errors.price && <span className="error-text">{errors.price}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label>הנחות</label>
                                        <input type="text" value={formData.discountDetails} onChange={(e) => setFormData({...formData, discountDetails: e.target.value})} className="input-standard" />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '10px' }}>
                                    <label>{formData.paymentMethod === 'link' ? 'קישור לתשלום/הרשמה' : formData.paymentMethod === 'bit' ? 'מספר טלפון לביט' : 'הוראות תשלום'}</label>
                                    <input 
                                        type={formData.paymentMethod === 'bit' ? 'tel' : 'text'} 
                                        dir={formData.paymentMethod === 'other' ? 'rtl' : 'ltr'}
                                        maxLength={formData.paymentMethod === 'bit' ? "10" : undefined}
                                        value={formData.paymentDetails} 
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            if(formData.paymentMethod === 'bit') val = val.replace(/\D/g, '');
                                            setFormData({...formData, paymentDetails: val});
                                        }} 
                                        className={`input-standard ${formData.paymentMethod !== 'other' ? 'standard-numbers' : ''} ${errors.paymentDetails ? 'error-border' : ''}`} 
                                    />
                                    {errors.paymentDetails && <span className="error-text">{errors.paymentDetails}</span>}
                                </div>
                            </div>
                        )}

                        <h4 className="section-title" style={{ marginTop: '32px' }}>תמונת אירוע</h4>
                        <div className="form-group">
                            
                            {!formData.photoUrl ? (
                                <div className="file-upload-container">
                                    <input 
                                        type="file" 
                                        id="event-image-upload"
                                        accept="image/*" 
                                        className="file-upload-input" 
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    <div className="upload-placeholder">
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                        </svg>
                                        <p style={{ margin: 0 }}>גרור תמונה לכאן או לחץ לבחירה</p>
                                    </div>
                                    
                                    {isUploading && (
                                        <div className="upload-progress-bar">
                                            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="image-preview">
                                    <img src={formData.photoUrl} alt="Event preview" />
                                    <button 
                                        type="button" 
                                        className="btn-remove-image" 
                                        onClick={() => { 
                                            setFormData(prev => ({ ...prev, photoUrl: '' })); 
                                            setUploadStatus('idle'); 
                                            const fileInput = document.getElementById('event-image-upload');
                                            if(fileInput) fileInput.value = '';
                                        }}
                                        title="הסר תמונה"
                                    >
                                        ✖
                                    </button>
                                </div>
                            )}

                            {uploadStatus === 'success' && (
                                <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>✓</span> תמונה הועלתה בהצלחה
                                </div>
                            )}
                            {uploadStatus === 'error' && (
                                <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>✖</span> שגיאה בהעלאת התמונה
                                </div>
                            )}

                        </div>

                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    {isEditMode ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-cancel pill-btn btn-danger" disabled={isLoading || isUploading}>🗑️ מחיקת אירוע</button>
                    ) : <div></div>}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" onClick={onCancel} className="btn-cancel pill-btn" disabled={isLoading || isUploading}>ביטול</button>
                        <button type="submit" className="btn-primary pill-btn" disabled={isLoading || isUploading}>{isEditMode ? 'שמירת שינויים' : 'שמירה ופרסום'}</button>
                    </div>
                </div>
            </form>

            {showDeleteConfirm && (
                <div className="validation-dialog-overlay">
                    <div className="validation-dialog-box">
                        <h4>האם אתה בטוח?</h4>
                        <p>פעולה זו תסיר את האירוע ולא יהיה ניתן לשחזר אותו.</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button className="btn-cancel pill-btn" onClick={() => setShowDeleteConfirm(false)}>ביטול</button>
                            <button className="btn-primary pill-btn btn-danger" style={{color: 'white', background: '#ef4444', border: 'none'}} onClick={handleDelete} disabled={isLoading}>כן, מחק</button>
                        </div>
                    </div>
                </div>
            )}

            {isMapExpanded && (
                <div className="event-modal-overlay">
                    <div className="event-modal-content map-modal-custom">
                        <button className="event-modal-close" onClick={closeMapAttempt}>✖</button>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--color-primary-dark)' }}>בחירת מיקום</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input type="text" value={pendingLocationText} onChange={(e) => setPendingLocationText(e.target.value)} className="input-standard" placeholder="חפש כתובת..." style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSearch(); }} />
                            <button type="button" onClick={handleAddressSearch} className="btn-secondary pill-btn" disabled={isSearching}>{isSearching ? '...' : 'חיפוש'}</button>
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
                                <button type="button" onClick={closeMapAttempt} className="btn-cancel pill-btn">סגירה</button>
                                <button type="button" onClick={confirmMapSelection} className="btn-primary pill-btn">אישור</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};