import { STORAGE_KEYS } from '@/lib/storage';

/*
 * Tiny scripts that must run before first paint, so they are inlined into the
 * prerendered HTML (and whitelisted in the CSP by hash). They mirror
 * `resolveInitialLang`: saved choice → browser languages → English.
 * Parity with the TypeScript implementation is asserted in src/test/lang.test.ts.
 */

/** Statements that leave the detected language in a local variable `l`. */
const DETECT_LANG = `var l='en';try{var s=localStorage.getItem('${STORAGE_KEYS.lang}');if(s==='en'||s==='vi'){l=s}else{var n=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];for(var i=0;i<n.length;i++){var b=String(n[i]).toLowerCase().split('-')[0];if(b==='en'||b==='vi'){l=b;break}}}}catch(e){}`;

/** Expression form, used by tests: evaluates to the detected language. */
export const detectLangExpression = `(function(){${DETECT_LANG}return l})()`;

/** DETECT_LANG, then a language at the start of the path wins: the 404 page of `/en/…` is English. */
const DETECT_LANG_WITH_PATH = `${DETECT_LANG}var p=location.pathname.split('/').filter(function(x){return x})[0];if(p==='en'||p==='vi'){l=p}`;

/** Expression form of what the 404 page detects, used by tests. */
export const notFoundLangExpression = `(function(){${DETECT_LANG_WITH_PATH}return l})()`;

/** Root page `/`: go to the right language, keeping query string and hash. */
export const redirectInlineScript = `(function(){${DETECT_LANG}location.replace('/'+l+location.search+location.hash)})();`;

/**
 * 404 page: a single 404.html has to serve both languages. English is in the
 * markup; other languages sit in <template id="nf-xx">. Before paint this swaps
 * in the language of the path or of the reader, so React then hydrates matching markup (no flash).
 */
export const notFoundLangInlineScript = `(function(){${DETECT_LANG_WITH_PATH}if(l==='en')return;var t=document.getElementById('nf-'+l),r=document.getElementById('root');if(!t||!r)return;r.innerHTML=t.innerHTML;document.documentElement.lang=l;var h=t.getAttribute('data-title');if(h)document.title=h})();`;
