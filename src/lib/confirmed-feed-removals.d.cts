import type {FeedItem} from './types';
export declare function removedFeedKey(item:FeedItem):string|null;
export declare function reconcileRemovedFeedKeys(
 removed:Set<string>,received:FeedItem[]
):{removed:Set<string>;visible:FeedItem[]};
