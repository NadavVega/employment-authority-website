import academicCareerIcon from '../assets/center-icons/academic-career.png';
import hebrewCareerIcon from '../assets/center-icons/hebrew-career.png';
import hizdamnutIcon from '../assets/center-icons/hizdamnut.png';
import kivunIcon from '../assets/center-icons/kivun.png';
import qualitaIcon from '../assets/center-icons/qualita.png';
import riyanIcon from '../assets/center-icons/riyan.png';
import employmentIcon from '../assets/center-icons/taasuka-logo-color.png';
import vatikimIcon from '../assets/center-icons/vatikim.png';

const CENTER_ICON_MATCHERS = [
    { terms: ['הזדמנות'], icon: hizdamnutIcon },
    { terms: ['כיוון'], icon: kivunIcon },
    { terms: ['פיתוח קריירה לאקדמאים', 'אקדמאים'], icon: academicCareerIcon },
    { terms: ['ריאן'], icon: riyanIcon },
    { terms: ['ותיקים'], icon: vatikimIcon },
    { terms: ['קעליטה', 'קליטה', 'qualita'], icon: qualitaIcon },
    { terms: ['אוניברסיטה העברית', 'אוניברסיטה העיברית', 'קריירה באוניברסיטה'], icon: hebrewCareerIcon },
    { terms: ['רשות התעסוקה', 'תעסוקה עירונית'], icon: employmentIcon },
];

export const getCenterIcon = (centerName = '') => {
    const normalizedName = String(centerName).trim().toLowerCase();
    if (!normalizedName) return null;

    return CENTER_ICON_MATCHERS.find(({ terms }) =>
        terms.some(term => normalizedName.includes(term.toLowerCase()))
    )?.icon || null;
};
