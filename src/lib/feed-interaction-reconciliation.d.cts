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
