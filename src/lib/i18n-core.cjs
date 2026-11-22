'use strict';
// App language. Portuguese text is the key: a screen not translated yet simply
// stays in Portuguese, and a missing English entry never shows a raw key.

const LANGUAGES=['pt','en'];

/** Saved choice first; otherwise the phone's language (Portuguese for pt-*, English for anything else). */
function pickLanguage(saved,deviceLocale){
 if(LANGUAGES.includes(saved))return saved;
 return /^pt\b/i.test(String(deviceLocale||'pt'))?'pt':'en';
}

function fill(text,params){
 if(!params)return text;
 return text.replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(params,k)?String(params[k]):m);
}

function translate(dictionary,language,text,params){
 const source=String(text??'');
 const out=language==='en'&&dictionary&&Object.prototype.hasOwnProperty.call(dictionary,source)?dictionary[source]:source;
 return fill(out,params);
}

/** Placeholders like {count} must be the same in both languages. */
function placeholders(text){return [...String(text).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();}

/** BCP-47 tag for dates and numbers. */
function localeTag(language){return language==='en'?'en-GB':'pt-PT';}

module.exports={LANGUAGES,pickLanguage,translate,placeholders,localeTag};
