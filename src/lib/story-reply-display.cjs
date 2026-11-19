'use strict';
/** The quick reactions sent from the Story viewer are private replies on the API.
 * Identify only exact known emoji reactions; arbitrary reply text remains text.
 */
const QUICK_REACTIONS=new Set(['❤️','🔥','👏','😂','😮','⚽']);
function isQuickStoryReaction(content){
 return typeof content==='string'&&QUICK_REACTIONS.has(content.trim());
}
function storyReplyKind(content){
 return isQuickStoryReaction(content)?'reaction':'message';
}
module.exports={isQuickStoryReaction,storyReplyKind};
