export function parseFavoriteSports(value:unknown):string[];
export function normalizeCatalog(response:unknown):string[];
export function toggleFavoriteSport(current:string,sport:string,catalog:string[]):string;
export function validateFavoriteSports(current:string,catalog:string[]):string|null;
export function filterSports(catalog:string[],search:string):string[];
