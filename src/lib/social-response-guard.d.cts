import type {FeedItem,SocialStory,SocialComment,FeedUserSuggestion} from './types';
export function requireSocialCollection(raw:unknown,kind:'feed'):FeedItem[];
export function requireSocialCollection(raw:unknown,kind:'story'):SocialStory[];
export function requireSocialCollection(raw:unknown,kind:'comment'):SocialComment[];
export function requireSocialCollection(raw:unknown,kind:'reply'):Array<{id:number;storyId:number;senderUsername:string;content:string;createdAt:string}>;
export function safeDiscoveredPeople(raw:unknown,limit?:number):FeedUserSuggestion[];
