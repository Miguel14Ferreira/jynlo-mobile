export declare function mediaUriExtension(uri:string|null|undefined):string|null;
export declare function isUnsupportedMediaContainer(uri:string|null|undefined):boolean;
export declare function pickerMediaMime(asset:{
 type?:'image'|'video'|string|null|undefined;
 uri:string;mimeType?:string|null
}):string|null;
