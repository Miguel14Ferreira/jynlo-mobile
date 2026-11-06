export const DISTRICTS:string[];
export function parseGps(latitude:string,longitude:string):{latitude:number|null;longitude:number|null};
export function parseHttps(value:string):string|null;
export interface NewVenueFields {
 name:string;city:string;district:string;address:string;venueType:string;surfaceType:string;
 openingHours:string;priceInfo:string;contact:string;website:string;latitude:string;longitude:string;
 environmentType:'INDOOR'|'OUTDOOR'|'BOTH'|'';ownershipType:''|'PUBLIC'|'PRIVATE';
 changingRooms:boolean;toilets:boolean;showers:boolean;accessible:boolean;wifi:boolean;
 lighting:boolean;parking:boolean;
}
export function buildVenueRequest(fields:NewVenueFields,sports:string[],catalog:string[]):Record<string,unknown>;
