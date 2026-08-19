// src/i18n.js
const SUPPORTED = ['tr', 'en'];
const DEFAULT_LANG = 'tr';
let currentDict = {};

async function loadDict(lang) {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error(`locale yüklenemedi: ${lang}`);
    return res.json();
}

function apply(dict) {
    // düz metin
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
    });

    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });

    // title (tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[key] !== undefined) el.setAttribute('title', dict[key]);
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
    });
}

export function t(key, vars) {
    let str = currentDict[key] !== undefined ? currentDict[key] : key;
    if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
            str = str.replace(`{${k}}`, v);
        });
    }
    return str;
}

export function getLang() {
    return localStorage.getItem('lang') || DEFAULT_LANG;
}

export async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    currentDict = await loadDict(lang);
    apply(currentDict);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang, dict: currentDict } }));
}

export function initI18n() {
    const saved = localStorage.getItem('lang');
    const browser = (navigator.language || 'tr').slice(0, 2);
    const initial = saved || (SUPPORTED.includes(browser) ? browser : DEFAULT_LANG);
    setLanguage(initial);
}