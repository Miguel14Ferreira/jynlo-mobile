export type LinkPart={text:string;url:string|null;internalPath:string|null};
export function linkParts(value:string|null|undefined):LinkPart[];
