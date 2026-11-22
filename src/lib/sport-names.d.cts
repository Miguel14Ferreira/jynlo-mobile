import type {AppLanguage} from './i18n-core.cjs';
export const EN_SPORTS:Readonly<Record<string,string>>;
export const EN_VENUE_TYPES:Readonly<Record<string,string>>;
export const EN_SURFACES:Readonly<Record<string,string>>;
export function sportName(value:string|null|undefined,language?:AppLanguage):string;
export function sportNames(value:string|null|undefined,language?:AppLanguage):string;
export function venueTypeName(value:string|null|undefined,language?:AppLanguage):string;
export function surfaceName(value:string|null|undefined,language?:AppLanguage):string;
export function sportMatches(value:string,query:string|null|undefined):boolean;
