export const buildEventShareUrl = (eventId) => {
    const baseUrl = window.location.origin;

    if (!eventId) {
        return `${baseUrl}/events`;
    }

    return `${baseUrl}/events?eventId=${encodeURIComponent(eventId)}`;
};

const buildShareText = ({ title, url }) => {
    const safeTitle = title || 'אירוע';
    return `${safeTitle}\n${url}`;
};

export const openShareTarget = (target, { title, url }) => {
    const safeTitle = title || 'שיתוף';
    const safeUrl = url || window.location.href;
    const encodedTitle = encodeURIComponent(safeTitle);
    const encodedBody = encodeURIComponent(buildShareText({ title: safeTitle, url: safeUrl }));

    const targets = {
        mail: `mailto:?subject=${encodedTitle}&body=${encodedBody}`,
        whatsapp: `https://wa.me/?text=${encodedBody}`,
        outlook: `https://outlook.office.com/mail/deeplink/compose?subject=${encodedTitle}&body=${encodedBody}`,
    };

    const shareUrl = targets[target];

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
};

export const copyShareLink = async (url) => {
    const safeUrl = url || window.location.href;

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(safeUrl);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = safeUrl;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';

    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};
