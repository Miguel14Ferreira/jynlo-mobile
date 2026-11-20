export declare function mentionTerm(text:string):string|null;
export declare function insertMention(text:string,username:string):string;
export declare function splitMentions(text:string):Array<{text:string;username:string|null}>;
