import type {MobileMedia} from './types';
export declare const MAX_ALBUM_ITEMS:number;
export declare const MAX_ALBUM_BYTES:number;
export declare function albumError(files:MobileMedia[],allowUnknownSize?:boolean):string|null;
export declare function mergeAlbum(existing:MobileMedia[],incoming:MobileMedia[]):MobileMedia[];
export declare function postMediaItems(item:{imageUrl?:string|null;videoUrl?:string|null;extraMedia?:Array<{url:string;mimeType:string}>|null}):Array<{url:string;type:'image'|'video'}>;
