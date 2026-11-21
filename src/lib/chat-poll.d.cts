export interface ChatPollContent { question: string; options: string[]; }
export declare const POLL_PREFIX: string;
export declare const POLL_MAX_QUESTION: number;
export declare const POLL_MAX_OPTION: number;
export declare const POLL_MAX_OPTIONS: number;
export declare function encodePoll(question: string, options: string[]): string;
export declare function readPoll(text: string | null | undefined): ChatPollContent | null;
export declare function isPollText(text: string | null | undefined): boolean;
