export interface NotificationPreferences {inAppEnabled:boolean;emailEnabled:boolean;disabledInAppTypes:string[];disabledEmailTypes:string[];}
export const PREFERENCE_GROUPS:readonly {title:string;types:{type:string;label:string}[]}[];
export const PREFERENCE_TYPES:readonly string[];
export function normalizePreferences(raw:unknown):NotificationPreferences;
export function toggleType(prefs:NotificationPreferences,channel:'inApp'|'email',type:string,enabled:boolean):NotificationPreferences;
export function samePreferences(a:NotificationPreferences,b:NotificationPreferences):boolean;
