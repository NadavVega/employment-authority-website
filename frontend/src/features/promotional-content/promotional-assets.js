import cityImage from '../../assets/images/city-view.png';
import employerServicesImage from '../../assets/images/content-bot-theme.jpg';
import careerCenterImage from '../../assets/images/Jerusalem-color-logo.jpeg';
import trainingImage from '../../assets/images/color-logo.png';

export const PROMOTIONAL_ASSETS = [
    {
        key: 'city-view',
        label: 'נוף ירושלים',
        mediaType: 'image',
        mediaUrl: cityImage,
        fit: 'cover',
    },
    {
        key: 'career-center-logo',
        label: 'לוגו ירושלים צבעוני',
        mediaType: 'image',
        mediaUrl: careerCenterImage,
        fit: 'contain',
    },
    {
        key: 'employer-services',
        label: 'שירותים למעסיקים',
        mediaType: 'image',
        mediaUrl: employerServicesImage,
        fit: 'cover',
    },
    {
        key: 'training-logo',
        label: 'לוגו הכשרות צבעוני',
        mediaType: 'image',
        mediaUrl: trainingImage,
        fit: 'contain',
    },
    {
        key: 'employment-authority-video',
        label: 'סרטון תדמית רשות התעסוקה',
        mediaType: 'video',
        mediaUrl: 'https://player.vimeo.com/video/1187966141?badge=0&autopause=0&player_id=0&app_id=58479',
        fit: 'cover',
    },
];

export const DEFAULT_PROMOTIONAL_SLIDES = [
    {
        id: 'default-city-services',
        title: 'שירותי תעסוקה לתושבי ירושלים',
        description: 'מרכזי קריירה, הכשרות, אירועים ושירותים למעסיקים ברחבי ירושלים.',
        mediaType: 'image',
        mediaUrl: cityImage,
        mediaAssetKey: 'city-view',
        order: 1,
        isActive: true,
        audience: 'all',
    },
    {
        id: 'default-career-support',
        title: 'ליווי מקצועי קרוב לבית',
        description: 'הכוונה, ייעוץ וכלים להשתלבות ולקידום בעולם העבודה.',
        mediaType: 'image',
        mediaUrl: careerCenterImage,
        mediaAssetKey: 'career-center-logo',
        order: 2,
        isActive: true,
        audience: 'all',
    },
    {
        id: 'default-employer-services',
        title: 'חיבור בין מעסיקים לכוח אדם איכותי',
        description: 'מענים עירוניים לפרסום הזדמנויות, שותפויות וגיוס עובדים בירושלים.',
        mediaType: 'image',
        mediaUrl: employerServicesImage,
        mediaAssetKey: 'employer-services',
        order: 3,
        isActive: true,
        audience: 'all',
    },
    {
        id: 'default-professional-training',
        title: 'כלים מעשיים להתפתחות מקצועית',
        description: 'סדנאות, קורסים ואירועי תעסוקה המותאמים לתושבי העיר.',
        mediaType: 'image',
        mediaUrl: trainingImage,
        mediaAssetKey: 'training-logo',
        order: 4,
        isActive: true,
        audience: 'all',
    },
];

export const getPromotionalAsset = (assetKey) => (
    PROMOTIONAL_ASSETS.find((asset) => asset.key === assetKey)
);
