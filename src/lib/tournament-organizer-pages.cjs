'use strict';
/**
 * Re-read every page already visible to the organizer after a saved result.
 * The server controls the cursor, fixture status, knockout progression and winner.
 * Never claim a complete calendar from a partial/failed pagination request.
 */
async function reconcileVisibleFixtures(fetchPage,previousPage,isCurrent,maxPages=60){
 if(typeof fetchPage!=='function'||typeof isCurrent!=='function'
   ||!Number.isSafeInteger(previousPage)||previousPage<0||previousPage>=maxPages)
  throw Error('Paginação do calendário inválida.');
 const matches=[],seenIds=new Set();
 let cursor=0,lastPage=0,hasMore=false;
 while(cursor<=previousPage){
  if(!isCurrent())return null;
  const data=await fetchPage(cursor);
  if(!isCurrent())return null;
  if(!data||data.page!==cursor||!Array.isArray(data.matches)||typeof data.hasMore!=='boolean')
   throw Error('O servidor devolveu uma página de jogos inválida. Atualiza novamente.');
  for(const match of data.matches){
   if(!match||!Number.isSafeInteger(match.id)||match.id<=0)
    throw Error('O servidor devolveu um jogo inválido.');
   if(seenIds.has(match.id))continue;
   seenIds.add(match.id);
   matches.push(match);
  }
  lastPage=data.page;
  hasMore=data.hasMore;
  if(!hasMore)break;
  if(data.matches.length===0)throw Error('A paginação dos jogos não avançou.');
  cursor++;
 }
 return {matches,page:lastPage,hasMore};
}
module.exports={reconcileVisibleFixtures};
