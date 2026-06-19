import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/auth-context';
import { eventService } from '../../services/interfaces/event-services';

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from '../../services/firebase/config';

import '../../design/event-page.css';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { EVENT_IMAGE_OPTIONS } from '../../utils/eventImageMap';
import { CENTER_COLORS } from '../../utils/centerColors';

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

const normalizeEventImageFields = (data) => {
  const image = data.image || '';
  const photoUrl = data.photoUrl || '';
  const photoPreview = data.photoPreview || '';
  const logoUrl = data.logoUrl || '';

  return {
    image,
    photoUrl,
    photoPreview,
    logoUrl,
    media: {
      ...(data.media || {}),
      photoUrl: photoUrl || photoPreview || '',
      logoUrl,
      videoUrl: data.videoUrl || data.media?.videoUrl || '',
    },
  };
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', type: '', date: '', startTime: '', endTime: '', location: '', capacity: '',
    description: '', isAccessible: false, center: '', coordinatorName: '',
    accessibilityContactName: '', paymentMethod: 'none', price: '', discountDetails: '',
    paymentDetails: '',
    image: '',
    photoUrl: '',
    logoUrl: '',
    photoPreview: null
  });

  const [coordinatorPhones, setCoordinatorPhones] = useState([{ prefix: '050', number: '' }]);
  const [accessibilityPhones, setAccessibilityPhones] = useState([{ prefix: '050', number: '' }]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        ...initialData,
        coordinatorName: initialData.coordinatorName || '',
        photoPreview: initialData.photoPreview || null,
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

  // --- Image Handling ---
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('נא להעלות קובץ תמונה בלבד');
      return;
    }

    const reader = new FileReader();

    reader.onload = (ev) => {
      setFormData(prev => ({
        ...prev,
        image: '',
        photoPreview: ev.target.result,
        photoUrl: ''
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    processImageFile(e.target.files[0]);
  };

  const handlePredefinedImageSelect = (option) => {
    setFormData(prev => ({
      ...prev,
      image: option.value,
      photoPreview: null,
      photoUrl: ''
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearEventImage = () => {
    setFormData(prev => ({
      ...prev,
      image: '',
      photoPreview: null,
      photoUrl: ''
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processImageFile(e.dataTransfer.files[0]);
  };

  // --- Calculations & Helpers ---
  const calculateTimeDifference = (start, end) => {
    if (!start || !end) return 0;
    const [sHours, sMins] = start.split(':').map(Number);
    const [eHours, eMins] = end.split(':').map(Number);
    return (eHours * 60 + eMins) - (sHours * 60 + sMins);
  };

  const handlePriceBlur = (e) => {
    const val = Number(e.target.value);
    if (val > 1000 && !priceWarningAccepted) setShowPriceWarning(true);
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

  // --- Validation ---
  const validateForm = () => {
    let newErrors = {};
    const nameRegex = /^[a-zA-Zא-ת\s]+$/;
    const phoneRegex = /^\d{7}$/;

    ['title', 'type', 'date', 'startTime', 'endTime', 'description'].forEach(field => {
        if (!formData[field]) newErrors[field] = 'שדה זה הוא חובה';
    });
    // location is only required for in-person events
    if (!formData.isOnline && !formData.location) {
        newErrors.location = 'שדה זה הוא חובה';
    }

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

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('שגיאה: ישנם שדות חסרים או לא תקינים. אנא בדוק את ההערות באדום בטופס.');
      return;
    }
    if (isUploading) { alert('אנא המתן לסיום העלאת התמונה'); return; }
    setIsLoading(true);
    try {
      const combinedCoordPhones = coordinatorPhones.map(p => `${p.prefix}-${p.number}`).join(', ');
      const combinedAccPhones = formData.isAccessible ? accessibilityPhones.map(p => `${p.prefix}-${p.number}`).join(', ') : '';
      const formattedData = {
        ...formData,
        ...normalizeEventImageFields(formData),
        coordinatorName: formData.coordinatorName,
        capacity: isCapacityUnlimited ? '' : formData.capacity,
        time: `${formData.startTime}-${formData.endTime}`,
        coordinatorPhone: combinedCoordPhones,
        accessibilityContactPhone: combinedAccPhones
      };
      if (isEditMode) {
        if (Object.prototype.hasOwnProperty.call(initialData, 'createdBy')) {
          formattedData.createdBy = initialData.createdBy;
        } else {
          delete formattedData.createdBy;
        }
      } else {
        formattedData.createdBy = currentUser.uid;
      }
      formattedData.status = 'published';
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 20000));
      const dbOperation = isEditMode
        ? eventService.updateEvent(initialData.id, formattedData)
        : eventService.createEvent(formattedData, currentUser, userRole);
      await Promise.race([dbOperation, timeoutPromise]);
      alert('האירוע נשמר ופורסם בהצלחה!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Submit Error:", error);
      setErrors({ global: 'שגיאה בשמירת האירוע: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!initialData || !initialData.id) {
      alert("Error: Cannot delete an event that hasn't fully loaded.");
      setShowDeleteConfirm(false);
      return;
    }
    setIsLoading(true);
    try {
      await eventService.updateEvent(initialData.id, { status: 'deleted' });
      alert('האירוע נמחק בהצלחה.');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to delete event:", error);
      setErrors({ global: error.message });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // --- Map ---
  const fetchAddress = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=he`);
      const data = await response.json();
      if (data && data.display_name) {
        const shortAddress = data.display_name.split(',').slice(0, 3).join(',');
        setPendingLocationText(shortAddress);
      }
    } catch (error) { console.error("Geocoding error:", error); }
  };

  const handleAddressSearch = async () => {
    if (!pendingLocationText) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pendingLocationText)}&limit=1&accept-language=he`);
      const data = await response.json();
      if (data && data.length > 0) {
        setPendingMapPosition({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } else {
        alert("לא מצאנו את הכתובת. נסה להוסיף את שם העיר.");
      }
    } finally { setIsSearching(false); }
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

  const openMap = () => {
    setIsMapExpanded(true);
    setPendingLocationText(formData.location);
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
  };
  const closeMapAttempt = () => setIsMapExpanded(false);
  const confirmMapSelection = () => {
    setFormData(prev => ({ ...prev, location: pendingLocationText }));
    setIsMapExpanded(false);
  };

  // --- Phone Inputs Renderer ---
  const renderPhoneInputs = (phoneArray, setPhoneArray, errorPrefix) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {phoneArray.map((phone, index) => (
        <div key={index}>
          <div className={`phone-split-input ${errors[`${errorPrefix}_${index}`] ? 'error-border' : ''}`} dir="ltr">
            <select
              value={phone.prefix}
              onChange={e => { const n = [...phoneArray]; n[index].prefix = e.target.value; setPhoneArray(n); }}
              className="phone-prefix standard-numbers"
            >
              {ISRAELI_PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="text"
              maxLength={7}
              value={phone.number}
              onChange={e => { const n = [...phoneArray]; n[index].number = e.target.value.replace(/\D/g, ''); setPhoneArray(n); }}
              className="phone-suffix standard-numbers"
              style={{ textAlign: 'left' }}
            />
            {phoneArray.length > 1 && (
              <button type="button" onClick={() => setPhoneArray(phoneArray.filter((_, i) => i !== index))} className="btn-remove-phone">✕</button>
            )}
          </div>
          {errors[`${errorPrefix}_${index}`] && <span className="error-text">{errors[`${errorPrefix}_${index}`]}</span>}
        </div>
      ))}
      <button type="button" onClick={() => handleAddPhone(phoneArray, setPhoneArray, errorPrefix)} className="btn-secondary pill-btn" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}>
        + הוסף מספר
      </button>
    </div>
  );

  const selectedPredefinedImage = EVENT_IMAGE_OPTIONS.find(
    option => option.value === formData.image
  );

  const eventImagePreviewSrc =
    formData.photoPreview ||
    formData.photoUrl ||
    selectedPredefinedImage?.src ||
    '';

  const hasEventImage = Boolean(eventImagePreviewSrc);

  // ===================== RENDER =====================
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

          {/* ===== LEFT COLUMN ===== */}
          <div className="form-column">

            {/* Title */}
            <div className="form-group">
              <label>כותרת האירוע</label>
              <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className={`input-standard ${errors.title ? 'error-border' : ''}`} />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            {/* Type + Capacity row */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>סוג אירוע</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className={`input-standard ${errors.type ? 'error-border' : ''}`}>
                  <option value="" disabled hidden>בחר סוג אירוע</option>
                                    <option value="הכשרה">הכשרה</option>
                                    <option value="יום קריירה">יום קריירה</option>
                                    <option value="ירידת עבודה">ירידת עבודה</option>
                                    <option value="סדנה">סדנה</option>
                </select>
                {errors.type && <span className="error-text">{errors.type}</span>}
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>כמות משתתפים</label>
                  <label className="radio-label" style={{ fontSize: '12px', margin: 0 }}>
                    <input type="checkbox" checked={isCapacityUnlimited} onChange={e => { setIsCapacityUnlimited(e.target.checked); setFormData({ ...formData, capacity: '' }); }} />
                    ללא הגבלה
                  </label>
                </div>
                <input type="number" dir="ltr" max={1000} min={1} disabled={isCapacityUnlimited} value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value.replace(/\D/g, '') })}
                  className={`input-standard standard-numbers ${errors.capacity ? 'error-border' : ''}`}
                  style={{ backgroundColor: isCapacityUnlimited ? '#f1f5f9' : '#fff' }} />
                {errors.capacity && <span className="error-text">{errors.capacity}</span>}
              </div>
            </div>

            {/* Center — full width */}
            <div className="form-group">
              <label>שיוך למרכז</label>
              <select value={formData.center} onChange={e => setFormData({ ...formData, center: e.target.value })} className="input-standard">
                <option value="">בחר מרכז</option>
                {Object.keys(CENTER_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                {(userRole === 'coordinator' && !isAdmin) && <option value="coordinators-only">coordinators-only</option>}
              </select>
            </div>

            {/* Date + Times row */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>תאריך</label>
                <input type="date" min={todayStr} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`input-standard standard-numbers ${errors.date ? 'error-border' : ''}`} />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>התחלה</label>
                <input type="time" step={900} value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className={`input-standard standard-numbers ${errors.startTime ? 'error-border' : ''}`} dir="ltr" />
                {errors.startTime && <span className="error-text">{errors.startTime}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>סיום</label>
                <input type="time" step={900} value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className={`input-standard standard-numbers ${errors.endTime ? 'error-border' : ''}`} dir="ltr" />
                {errors.endTime && <span className="error-text">{errors.endTime}</span>}
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>מיקום</label>
                <label className="radio-label" style={{ fontSize: '12px', margin: 0 }}>
                  <input type="checkbox" checked={formData.isOnline} onChange={e => setFormData({ ...formData, isOnline: e.target.checked })} />
                  אירוע מקוון (Zoom / Teams)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder={formData.isOnline ? 'הכנס קישור...' : 'הכנס כתובת או בחר במפה'}
                  className={`input-standard ${errors.location ? 'error-border' : ''}`}
                  style={{ flex: 1, direction: (formData.isOnline && formData.location.startsWith('http')) ? 'ltr' : 'rtl' }} />
                {!formData.isOnline && (
                  <button type="button" onClick={openMap} className="btn-secondary pill-btn" style={{ whiteSpace: 'nowrap' }}>
                    🗺 פתח מפה
                  </button>
                )}
              </div>
              {errors.location && <span className="error-text">{errors.location}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label>תיאור קצר</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={6} className={`input-standard ${errors.description ? 'error-border' : ''}`} />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="form-column">

            {/* ===== COORDINATOR CONTACT — single block ===== */}
            <div className="form-group">
              <label>פרטי אחראי אירוע</label>
              <input
                type="text"
                value={formData.coordinatorName || ''}
                onChange={e => setFormData({ ...formData, coordinatorName: e.target.value })}
                className="input-standard"
                placeholder="שם מלא"
                style={{ marginBottom: '10px' }}
              />
              {renderPhoneInputs(coordinatorPhones, setCoordinatorPhones, 'coordPhone')}
            </div>
            {/* Accessibility toggle */}
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={formData.isAccessible} onChange={e => setFormData({ ...formData, isAccessible: e.target.checked })} id="accessibility-toggle" style={{ width: '20px', height: '20px' }} />
              <label htmlFor="accessibility-toggle" style={{ margin: 0, cursor: 'pointer' }}>אירוע מונגש לבעלי מוגבלויות</label>
            </div>

            {formData.isAccessible && (
              <div className="panel-box" style={{ marginTop: 0 }}>
                <div className="form-group">
                  <label>שם איש קשר לנגישות</label>
                  <input type="text" value={formData.accessibilityContactName} onChange={e => setFormData({ ...formData, accessibilityContactName: e.target.value })} className={`input-standard ${errors.accName ? 'error-border' : ''}`} />
                  {errors.accName && <span className="error-text">{errors.accName}</span>}
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label>טלפון נגישות</label>
                    <button type="button" className="btn-secondary pill-btn" onClick={handleAutofillAccessibilityPhone} style={{ padding: '4px 12px', fontSize: '12px' }}>העתק מרכז</button>
                  </div>
                  {renderPhoneInputs(accessibilityPhones, setAccessibilityPhones, 'accPhone')}
                </div>
              </div>
            )}

            {/* ===== PAYMENT ===== */}
            <h4 className="section-title" style={{ marginTop: '32px' }}>תשלום והרשמה</h4>
            <div className="form-group">
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {[['none', 'חינם'], ['link', 'קישור'], ['bit', 'ביט'], ['other', 'אחר']].map(([val, label]) => (
                  <label key={val} className="radio-label">
                    <input type="radio" value={val} checked={formData.paymentMethod === val}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value, price: '', paymentDetails: '' })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {formData.paymentMethod !== 'none' && (
              <div className="panel-box" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>מחיר (₪)</label>
                    <input type="number" dir="ltr" min={0} onBlur={handlePriceBlur} value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value.replace(/\D/g, '') })}
                      className={`input-standard standard-numbers ${errors.price ? 'error-border' : ''}`} />
                    {errors.price && <span className="error-text">{errors.price}</span>}
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>הנחות</label>
                    <input type="text" value={formData.discountDetails} onChange={e => setFormData({ ...formData, discountDetails: e.target.value })} className="input-standard" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>{formData.paymentMethod === 'link' ? 'קישור לתשלום' : formData.paymentMethod === 'bit' ? 'מספר ביט' : 'פרטי תשלום'}</label>
                  <input
                    type={formData.paymentMethod === 'bit' ? 'tel' : 'text'}
                    dir={formData.paymentMethod === 'other' ? 'rtl' : 'ltr'}
                    maxLength={formData.paymentMethod === 'bit' ? 10 : undefined}
                    value={formData.paymentDetails}
                    onChange={e => {
                      let val = e.target.value;
                      if (formData.paymentMethod === 'bit') val = val.replace(/\D/g, '');
                      setFormData({ ...formData, paymentDetails: val });
                    }}
                    className={`input-standard ${formData.paymentMethod !== 'other' ? 'standard-numbers' : ''} ${errors.paymentDetails ? 'error-border' : ''}`} />
                  {errors.paymentDetails && <span className="error-text">{errors.paymentDetails}</span>}
                </div>
              </div>
            )}

            {/* ===== IMAGE UPLOAD ===== */}
            <h4 className="section-title" style={{ marginTop: '30px' }}>תמונת אירוע</h4>

            <div className="form-group">
              {!hasEventImage ? (
                <div
                  style={{
                    border: `2px dashed ${isDragging ? 'var(--color-primary, #1a56db)' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    padding: '18px',
                    backgroundColor: isDragging ? '#f0f7ff' : 'transparent',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary-dark, #0f2f6b)', marginBottom: '4px' }}>
                      בחר תמונה קיימת
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      ניתן לבחור תמונה מוכנה או להעלות תמונה משלך
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '12px',
                      marginBottom: '18px'
                    }}
                  >
                    {EVENT_IMAGE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePredefinedImageSelect(option)}
                        style={{
                          border: '1px solid #dbe4ef',
                          borderRadius: '10px',
                          background: '#fff',
                          padding: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                          transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 23, 42, 0.12)';
                          e.currentTarget.style.borderColor = 'var(--color-primary, #1a56db)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.06)';
                          e.currentTarget.style.borderColor = '#dbe4ef';
                        }}
                      >
                        <img
                          src={option.src}
                          alt={option.label}
                          style={{
                            width: '100%',
                            height: '74px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block',
                            marginBottom: '7px'
                          }}
                        />
                        <span
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0f172a',
                            lineHeight: 1.3
                          }}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '8px 0 14px'
                    }}
                  >
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>או</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>

                  <label
                    htmlFor="photo-upload-input"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '22px 16px',
                      cursor: 'pointer',
                      color: '#64748b',
                      gap: '4px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>

                    <span style={{ fontSize: '14px' }}>
                      גרור תמונה לכאן או <u>לחץ לבחירה</u>
                    </span>

                    <input
                      id="photo-upload-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={eventImagePreviewSrc}
                    alt={selectedPredefinedImage?.label || 'תצוגה מקדימה'}
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />

                  {selectedPredefinedImage && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        background: 'rgba(255,255,255,0.92)',
                        color: '#0f172a',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {selectedPredefinedImage.label}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={handleClearEventImage}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ✕ הסר
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
          {isEditMode && isAdmin ? (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-secondary pill-btn btn-danger" disabled={isLoading || isUploading}>
              🗑 מחק אירוע
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onCancel} className="btn-cancel pill-btn" disabled={isLoading || isUploading}>ביטול</button>
            <button type="submit" className="btn-primary pill-btn" disabled={isLoading || isUploading}>
              {isEditMode ? 'שמור שינויים' : 'פרסם אירוע'}
            </button>
          </div>
        </div>
      </form>

      {/* ===== DELETE CONFIRM DIALOG ===== */}
      {showDeleteConfirm && (
        <div className="validation-dialog-overlay">
          <div className="validation-dialog-box">
            <h4>מחיקת אירוע?</h4>
            <p>פעולה זו תסיר את האירוע ולא יהיה ניתן לשחזר אותו.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-cancel pill-btn" onClick={() => setShowDeleteConfirm(false)}>ביטול</button>
              <button className="btn-primary pill-btn btn-danger" style={{ color: 'white', background: '#ef4444', border: 'none' }} onClick={handleDelete} disabled={isLoading}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRICE WARNING DIALOG ===== */}
      {showPriceWarning && (
        <div className="validation-dialog-overlay">
          <div className="validation-dialog-box">
            <h4>מחיר גבוה</h4>
            <p>המחיר שהזנת גבוה מ-1,000 ₪. האם אתה בטוח?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-cancel pill-btn" onClick={() => { setShowPriceWarning(false); setFormData(prev => ({ ...prev, price: '' })); }}>שנה מחיר</button>
              <button className="btn-primary pill-btn" onClick={() => { setPriceWarningAccepted(true); setShowPriceWarning(false); }}>אישור</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAP MODAL ===== */}
      {isMapExpanded && (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.25)'   // light dim, not full dark overlay
            }}>
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                width: '520px',
                maxWidth: '95vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                position: 'relative'
            }}>
            <button className="event-modal-close" onClick={closeMapAttempt}>✕</button>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--color-primary-dark)' }}>בחירת מיקום</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={pendingLocationText}
                onChange={e => setPendingLocationText(e.target.value)}
                className="input-standard"
                placeholder="חפש כתובת..."
                style={{ flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddressSearch(); }}
              />
              <button type="button" onClick={handleAddressSearch} className="btn-secondary pill-btn" disabled={isSearching}>
                {isSearching ? '...' : 'חיפוש'}
              </button>
            </div>
            <div style={{ height: '320px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 1 }}>
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
