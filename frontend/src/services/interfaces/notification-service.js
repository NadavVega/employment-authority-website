import {
    addDoc,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase/config';

const COLLECTION_NAME = 'notifications';
const NOTIFICATION_LIMIT = 15;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const noop = () => {};

export const subscribeToMyNotifications = (currentUser, callback) => {
    const recipientEmail = normalizeEmail(currentUser?.email);
    const safeCallback = typeof callback === 'function'
        ? (notifications) => {
            try {
                callback(notifications);
            } catch (error) {
                console.error('NotificationService Error: callback failed', error);
            }
        }
        : noop;

    if (!recipientEmail) {
        safeCallback([]);
        return noop;
    }

    const notificationsQuery = query(
        collection(db, COLLECTION_NAME),
        where('recipientEmail', '==', recipientEmail),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATION_LIMIT)
    );

    try {
        return onSnapshot(
            notificationsQuery,
            (snapshot) => {
                safeCallback(snapshot.docs.map((notificationDoc) => ({
                    id: notificationDoc.id,
                    ...notificationDoc.data(),
                })));
            },
            (error) => {
                console.error('NotificationService Error: subscription failed', error);
                safeCallback([]);
            }
        );
    } catch (error) {
        console.error('NotificationService Error: subscription setup failed', error);
        safeCallback([]);
        return noop;
    }
};

export const markNotificationRead = async (notificationId) => {
    if (!notificationId) {
        return;
    }

    await updateDoc(doc(db, COLLECTION_NAME, notificationId), {
        isRead: true,
        readAt: serverTimestamp(),
    });
};

export const markAllNotificationsRead = async (notifications = []) => {
    const unreadNotifications = notifications.filter(
        (notification) => notification?.id && !notification.isRead
    );

    if (unreadNotifications.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    unreadNotifications.forEach((notification) => {
        batch.update(doc(db, COLLECTION_NAME, notification.id), {
            isRead: true,
            readAt: serverTimestamp(),
        });
    });

    await batch.commit();
};

export const createEventMessageNotification = async ({
    recipient,
    sender,
    eventId,
    message = '',
}) => {
    const recipientEmail = normalizeEmail(recipient?.email);
    const senderEmail = normalizeEmail(sender?.email);
    const senderName = String(
        sender?.displayName ||
        sender?.profile?.fullName ||
        sender?.fullName ||
        senderEmail ||
        ''
    ).trim();

    if (!recipientEmail || !senderEmail || !sender?.uid || !eventId) {
        throw new Error('Missing event message notification data.');
    }

    const notificationData = {
        recipientEmail,
        senderEmail,
        senderUid: sender.uid,
        senderName,

        type: 'event_message',
        title: 'אירוע נשלח אליך',
        body: `${senderName || senderEmail} שלח לך אירוע`,
        message: String(message || '').trim(),
        eventId,
        link: `/events?eventId=${eventId}`,

        isRead: false,
        createdAt: serverTimestamp(),
        readAt: null,
    };

    if (recipient?.uid) {
        notificationData.recipientUid = recipient.uid;
    }

    return addDoc(collection(db, COLLECTION_NAME), notificationData);
};

export const createPrivateDetailsRequestNotification = async ({
    recipient,
    recipientEmail: directRecipientEmail,
    recipientUid: directRecipientUid,
    sender,
    senderEmail: directSenderEmail,
    senderName: directSenderName,
    senderUid: directSenderUid,
    requestId,
}) => {
    const recipientEmail = normalizeEmail(directRecipientEmail || recipient?.email);
    const senderEmail = normalizeEmail(directSenderEmail || sender?.email);
    const senderName = String(
        directSenderName ||
        sender?.displayName ||
        sender?.profile?.fullName ||
        sender?.fullName ||
        senderEmail ||
        ''
    ).trim();
    const senderUid = directSenderUid || sender?.uid || '';
    const recipientUid = directRecipientUid || recipient?.uid || '';

    if (!recipientEmail || !senderEmail || !requestId) {
        throw new Error('Missing private details request notification data.');
    }

    const notificationData = {
        recipientEmail,
        senderEmail,
        senderName,

        type: 'private_details_request',
        title: 'בקשה לצפייה בפרטים האישיים',
        body: `${senderName || senderEmail} ביקש גישה לפרטים האישיים שלך`,
        message: '',
        requestId,
        link: '/privacy-requests',

        isRead: false,
        createdAt: serverTimestamp(),
        readAt: null,
    };

    if (senderUid) {
        notificationData.senderUid = senderUid;
    }

    if (recipientUid) {
        notificationData.recipientUid = recipientUid;
    }

    return addDoc(collection(db, COLLECTION_NAME), notificationData);
};

export const createPrivateDetailsCoordinatorApprovalNotification = async ({
    recipient,
    recipientEmail: directRecipientEmail,
    recipientUid: directRecipientUid,
    sender,
    senderEmail: directSenderEmail,
    senderName: directSenderName,
    senderUid: directSenderUid,
    requestId,
}) => {
    const recipientEmail = normalizeEmail(directRecipientEmail || recipient?.email);
    const senderEmail = normalizeEmail(directSenderEmail || sender?.email);
    const senderName = String(
        directSenderName ||
        sender?.displayName ||
        sender?.profile?.fullName ||
        sender?.fullName ||
        senderEmail ||
        ''
    ).trim();
    const senderUid = directSenderUid || sender?.uid || '';
    const recipientUid = directRecipientUid || recipient?.uid || '';

    if (!recipientEmail || !senderEmail || !requestId) {
        throw new Error('Missing private details coordinator approval notification data.');
    }

    const notificationData = {
        recipientEmail,
        senderEmail,
        senderName,

        type: 'private_details_coordinator_approval',
        title: 'בקשת גישה דורשת אישור רכז',
        body: `${senderName || senderEmail} ביקש גישה לפרטי מעסיק המשויך אליך`,
        message: '',
        requestId,
        link: '/privacy-requests',

        isRead: false,
        createdAt: serverTimestamp(),
        readAt: null,
    };

    if (senderUid) {
        notificationData.senderUid = senderUid;
    }

    if (recipientUid) {
        notificationData.recipientUid = recipientUid;
    }

    return addDoc(collection(db, COLLECTION_NAME), notificationData);
};

export const notificationService = {
    subscribeToMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    createEventMessageNotification,
    createPrivateDetailsRequestNotification,
    createPrivateDetailsCoordinatorApprovalNotification,
};
