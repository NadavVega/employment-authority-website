import { useAuth } from '../../context/auth-context';
import { useNavigate } from 'react-router-dom';
import '../../design/event-card.css';
import '../../pages/event-page'
import defaultPicture  from '../../assets/images/default-event.jpg';
import { getEventColor } from '../../utils/centerColors';
import { getCenterIcon } from '../../utils/centerIcons';
import { resolveEventImage } from '../../utils/eventImageMap';
import { getEventLocation, getMapSearchUrl } from '../../utils/mapLinks';

const formatShortAddress = (address) => {
    if (!address) return 'מקוון';
    const parts = address.split(',');
    let shortAddress = parts[0].trim();
    if (/^\d+$/.test(shortAddress) && parts.length > 1) {
        shortAddress = `${parts[1].trim()} ${shortAddress}`;
    }
    return shortAddress;
};

export const EventCard = ({ event, isExpired, index = 0, onOpenDetails, onApprove, onDelete, isRegistered }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();

    const isCreator = event.createdBy === currentUser?.uid;
    const canEdit = isAdmin || isCreator;
    const isPending = event.status === 'pending';

    const handleEditClick = (e) => {
        e.stopPropagation();
        navigate(`/edit-event/${event.id}`);
    };

    const dateObj = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    const dayMonth = isNaN(dateObj) ? '--' : `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
    const fullDate = isNaN(dateObj) ? 'טרם נקבע' : dateObj.toLocaleDateString('he-IL');

    const cardImage = resolveEventImage(event) || defaultPicture;
    const centerIcon = getCenterIcon(event.center);
    const location = getEventLocation(event);
    const shortLocation = formatShortAddress(location);
    const mapUrl = getMapSearchUrl(event);

    const handleCardKeyDown = (keyboardEvent) => {
        if (keyboardEvent.target !== keyboardEvent.currentTarget) return;

        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault();
            onOpenDetails(event);
        }
    };

    return (
        <div
            className={`event-card ${isExpired ? 'event-card-expired' : ''}`}
            onClick={() => onOpenDetails(event)}
            onKeyDown={handleCardKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`פרטי האירוע ${event.title}`}
        >
            
            <div className="event-card-image-area" style={{ backgroundImage: `url(${cardImage})` }}>
                <div className="event-center-logo" title={event.center || 'מרכז תעסוקה'}>
                    {centerIcon ? (
                        <img src={centerIcon} alt={event.center || 'לוגו המרכז'} />
                    ) : (
                        <span aria-hidden="true">{event.center?.trim()?.charAt(0) || 'מ'}</span>
                    )}
                </div>
                <div className="card-badges-container">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {event.paymentMethod === 'none' && <div className="badge-free">חינם</div>}
                        {isPending && !isAdmin && isCreator && <span className="status-badge-pending">מחכה לאישור</span>}
                        {isPending && isAdmin && (
                            <button className="btn-approve pill-btn" onClick={(e) => { e.stopPropagation(); onApprove(event.id); }} style={{ padding: '4px 8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                אשר אירוע
                            </button>
                        )}
                        {/* ALREADY REGISTERED CHECKMARK */}
                        {isRegistered && (
                        <div style={{
                            background: '#10b981', color: 'white', padding: '4px 12px',
                            borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            רשום
                        </div>
                    )}
                        {/* Accessibility Icon */}
                        {event.isAccessible && (
                            <div className="badge-accessibility" title="נגיש לנכים">
                                <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={22}
                                height={22}
                                viewBox="0 0 100 100"
                                fill="white"
                                >
                                {/* Head */}
                                <circle cx="50" cy="12" r="10" />
                                {/* Body + arm + seat */}
                                <path d="M55 25 L45 25 L38 55 L62 55 L68 70 L78 66 L70 48 L52 48 L57 30 Z" />
                                {/* Wheel */}
                                <circle cx="42" cy="75" r="18" fill="none" stroke="white" strokeWidth="8" />
                                {/* Small front wheel */}
                                <circle cx="72" cy="75" r="6" />
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    {/* Archive button for Expired */}
                    {canEdit && (
                        isExpired ? (
                            <button className="edit-pencil-btn-new" onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} style={{ background: 'var(--color-text-muted)' }} title="העבר לארכיון">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="5" rx="2" ry="2"></rect>
                                            <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"></path>
                                            <path d="M10 13h4"></path>
                                </svg>
                            </button>
                        ) : (
                            <button className="edit-pencil-btn-new" onClick={handleEditClick} title="עריכת אירוע">
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                            </button>
                        )
                    )}
                </div>

                <div className="event-card-overlay">
                    <div className="overlay-meta-grid">
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span dir="ltr" className="standard-numbers">{event.time || 'טרם נקבע'}</span>
                        </div>
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span className="standard-numbers">{fullDate}</span>
                        </div>
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {mapUrl ? (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                                >
                                    {shortLocation}
                                </a>
                            ) : (
                                <span>{location ? shortLocation : 'מקוון'}</span>
                            )}
                        </div>
                    </div>
                    <div className="overlay-desc">{event.description}</div>
                    <button className="overlay-btn" onClick={(e) => { e.stopPropagation(); onOpenDetails(event); }}>לכל הפרטים &gt;</button>
                </div>
            </div>

            <div 
                className="event-card-bottom"
                style={{ borderTop: `4px solid ${getEventColor(event, index)}` }}>
                <div className="bottom-date-area standard-numbers">
                    <p className="bottom-date-big">{dayMonth}</p>
                </div>
                <div className="bottom-title-area">
                    <p className="bottom-title">{event.title}</p>
                </div>
            </div>
        </div>
    );
};
