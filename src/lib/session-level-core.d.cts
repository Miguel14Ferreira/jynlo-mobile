export type SessionSkillLevel='BEGINNER'|'INTERMEDIATE'|'ADVANCED';
export const LEVELS:readonly SessionSkillLevel[];
export function isLevel(value:unknown):value is SessionSkillLevel;
export function levelLabel(value:string|null|undefined):string;
export function filterChoices():{value:''|SessionSkillLevel;label:string}[];
export function sessionChoices():{value:''|SessionSkillLevel;label:string}[];
