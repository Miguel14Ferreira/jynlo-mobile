import type {MobileMedia} from './types';
export const MAX_ALBUM_ITEMS:number;
export const MAX_ALBUM_BYTES:number;
export function albumError(files:MobileMedia[]):string|null;
export function mergeAlbum(existing:MobileMedia[],incoming:MobileMedia[]):MobileMedia[];
export function postMediaItems(item:{imageUrl?:string|null;videoUrl?:string|null;extraMedia?:Array<{url:string;mimeType:string}>|null}):Array<{url:string;type:'image'|'video'}>;
