export type AppLanguage='pt'|'en';
export const LANGUAGES:readonly AppLanguage[];
export function pickLanguage(saved:string|null|undefined,deviceLocale:string|null|undefined):AppLanguage;
export function translate(dictionary:Readonly<Record<string,string>>,language:AppLanguage,text:string,params?:Record<string,string|number>):string;
export function placeholders(text:string):string[];
export function localeTag(language:AppLanguage):string;
export function setCurrentLanguage(language:AppLanguage):void;
export function currentLanguage():AppLanguage;
export function tr(text:string,params?:Record<string,string|number>):string;
