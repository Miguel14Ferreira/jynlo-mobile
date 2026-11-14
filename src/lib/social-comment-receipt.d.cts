import type {SocialComment} from './types';
export interface ExpectedCommentReceipt {
 postId:number;commentId?:number|null;username?:string|null;
 content?:string|null;likedByMe?:boolean|null;
}
export declare function verifiedCommentReceipt(
 result:unknown,expected:ExpectedCommentReceipt
):SocialComment|null;
