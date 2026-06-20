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

export const subscribeToMyNotifications = (currentUser, callback) => {
    const recipientEmail = normalizeEmail(currentUser?.email);

    if (!recipientEmail) {
        callback([]);
        return () => {};
    }

    const notificationsQuery = query(
        collection(db, COLLECTION_NAME),
        where('recipientEmail', '==', recipientEmail),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATION_LIMIT)
    );

    return onSnapshot(
        notificationsQuery,
        (snapshot) => {
            callback(snapshot.docs.map((notificationDoc) => ({
                id: notificationDoc.id,
                ...notificationDoc.data(),
            })));
        },
        (error) => {
            console.error('NotificationService Error: subscription failed', error);
            callback([]);
        }
    );
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

    return addDoc(collection(db, COLLECTION_NAME), {
        recipientEmail,
        recipientUid: recipient?.uid || null,
        senderEmail,
        senderUid: sender.uid,
        senderName,

        type: 'event_message',
        title: 'אירוע נשלח אליך',
        body: `${senderName || senderEmail} שלח לך אירוע`,
        message: String(message || '').trim(),
        eventId,
        link: `/events?eventId=${encodeURIComponent(eventId)}`,

        isRead: false,
        createdAt: serverTimestamp(),
        readAt: null,
    });
};

export const notificationService = {
    subscribeToMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    createEventMessageNotification,
};
