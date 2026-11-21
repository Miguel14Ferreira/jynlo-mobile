export const POPULAR:readonly string[];
export const MAX_SPORTS:number;
export function sportChoices(catalog:readonly string[],filter:string,selected:readonly string[]):string[];
export function toggleSport(selected:readonly string[],sport:string):string[];
export function shouldOffer(state:{needed:boolean}|null|undefined,skipped:boolean):boolean;
export function skipFileName(username:string):string;
