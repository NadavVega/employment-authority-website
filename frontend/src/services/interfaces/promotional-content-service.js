import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const COLLECTION_NAME = 'promotional_content';
const COLLECTION_PATH = `/${COLLECTION_NAME}`;

const logFirestoreError = (operation, path, error, constraints = []) => {
    console.error('Promotional content Firestore operation failed', {
        operation,
        path,
        constraints,
        authEmail: auth.currentUser?.email?.toLowerCase() || null,
        expectedUserDocument: auth.currentUser?.email
            ? `/users/${auth.currentUser.email.toLowerCase()}`
            : null,
        code: error?.code || null,
        message: error?.message || String(error),
    });
};

const byDisplayOrder = (first, second) => (
    Number(first.order || 0) - Number(second.order || 0)
);

const normalizeSlide = (slideDocument) => {
    const data = slideDocument.data();
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.trim() : '';
    const mediaAssetKey = typeof data.mediaAssetKey === 'string'
        ? data.mediaAssetKey.trim()
        : '';

    if (
        !title
        || !description
        || !['image', 'video'].includes(data.mediaType)
        || (!mediaUrl && !mediaAssetKey)
    ) {
        console.warn(`Ignoring invalid promotional slide: ${slideDocument.id}`);
        return null;
    }

    return {
        id: slideDocument.id,
        ...data,
        title,
        description,
        mediaUrl,
        mediaAssetKey,
        audience: data.audience || 'all',
    };
};

const mapSnapshot = (snapshot) => (
    snapshot.docs
        .map(normalizeSlide)
        .filter(Boolean)
        .sort(byDisplayOrder)
);

const audienceIncludesRole = (audience, userRole) => (
    audience === 'all' || audience === userRole
);

const sanitizeSlide = (slide, updatedBy) => ({
    title: slide.title.trim(),
    description: slide.description.trim(),
    mediaType: slide.mediaType,
    mediaUrl: slide.mediaUrl?.trim() || '',
    mediaAssetKey: slide.mediaAssetKey?.trim() || '',
    order: Math.max(0, Math.trunc(Number(slide.order) || 0)),
    isActive: Boolean(slide.isActive),
    audience: slide.audience || 'all',
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy.toLowerCase(),
});

export const promotionalContentService = {
    subscribeToActiveSlides(userRole, onData, onError) {
        const activeSlidesQuery = query(
            collection(db, COLLECTION_NAME),
            where('isActive', '==', true),
            orderBy('order')
        );

        return onSnapshot(
            activeSlidesQuery,
            (snapshot) => {
                const slides = mapSnapshot(snapshot)
                    .filter((slide) => audienceIncludesRole(slide.audience, userRole));
                onData(slides);
            },
            (error) => {
                logFirestoreError(
                    'list-active',
                    COLLECTION_PATH,
                    error,
                    ['isActive == true', 'order by order ascending']
                );
                onError(error);
            }
        );
    },

    async getAllSlides() {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION_NAME));
            return mapSnapshot(snapshot);
        } catch (error) {
            logFirestoreError('list-all', COLLECTION_PATH, error);
            throw error;
        }
    },

    async saveSlide(slide) {
        const updatedBy = auth.currentUser?.email;
        if (!updatedBy) {
            const error = new Error('An authenticated admin is required to save promotional content.');
            error.code = 'unauthenticated';
            throw error;
        }

        const data = sanitizeSlide(slide, updatedBy);
        if (!data.mediaUrl && !data.mediaAssetKey) {
            throw new Error('A promotional slide must have a media URL or local asset key.');
        }

        if (slide.id && !slide.id.startsWith('new-')) {
            try {
                await updateDoc(doc(db, COLLECTION_NAME, slide.id), data);
                return slide.id;
            } catch (error) {
                logFirestoreError('update', `${COLLECTION_PATH}/${slide.id}`, error);
                throw error;
            }
        }

        try {
            const createdSlide = await addDoc(collection(db, COLLECTION_NAME), data);
            return createdSlide.id;
        } catch (error) {
            logFirestoreError('create', COLLECTION_PATH, error);
            throw error;
        }
    },

    async deleteSlide(slideId) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, slideId));
        } catch (error) {
            logFirestoreError('delete', `${COLLECTION_PATH}/${slideId}`, error);
            throw error;
        }
    },
};
