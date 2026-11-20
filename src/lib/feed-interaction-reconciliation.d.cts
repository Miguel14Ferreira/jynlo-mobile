import type {FeedItem} from './types';
export interface VerifiedLikeReceipt {likedByMe:boolean;likeCount:number;}
export interface PendingLikeReceipt extends VerifiedLikeReceipt {until:number;}
export declare const RECEIPT_TTL_MS:number;
export declare function rememberPostLike(
 receipts:Map<number,PendingLikeReceipt>,postId:number,
 receipt:VerifiedLikeReceipt,now?:number
):Map<number,PendingLikeReceipt>;
export declare function reconcilePostLikes(
 receipts:Map<number,PendingLikeReceipt>,posts:FeedItem[],now?:number
):{receipts:Map<number,PendingLikeReceipt>;posts:FeedItem[]};
export interface PendingCommentFloor {count:number;until:number;}
export declare function rememberCommentFloor(
 floors:Map<number,PendingCommentFloor>,postId:number,count:number,now?:number
):Map<number,PendingCommentFloor>;
export declare function reconcileCommentCounts(
 floors:Map<number,PendingCommentFloor>,posts:FeedItem[],now?:number
):{floors:Map<number,PendingCommentFloor>;posts:FeedItem[]};
export interface PendingPostEdit {content:string;location:string|null;until:number;mediaReplaced?:boolean;imageUrl?:string|null;videoUrl?:string|null;extraMedia?:unknown;}
export declare function rememberPostEdit(
 edits:Map<number,PendingPostEdit>,post:FeedItem,now?:number,mediaReplaced?:boolean
):Map<number,PendingPostEdit>;
export declare function reconcilePostEdits(
 edits:Map<number,PendingPostEdit>,posts:FeedItem[],now?:number
):{edits:Map<number,PendingPostEdit>;posts:FeedItem[]};
