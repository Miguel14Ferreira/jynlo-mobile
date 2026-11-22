'use strict';
const {tr}=require('./i18n-core.cjs');
/**
 * Re-read every page already visible to the organizer after a saved result.
 * The server controls the cursor, fixture status, knockout progression and winner.
 * Never claim a complete calendar from a partial/failed pagination request.
 */
async function reconcileVisibleFixtures(fetchPage,previousPage,isCurrent,maxPages=60){
 if(typeof fetchPage!=='function'||typeof isCurrent!=='function'
   ||!Number.isSafeInteger(previousPage)||previousPage<0||previousPage>=maxPages)
  throw Error(tr('Paginação do calendário inválida.'));
 const matches=[],seenIds=new Set();
 let cursor=0,lastPage=0,hasMore=false;
 while(cursor<=previousPage){
  if(!isCurrent())return null;
  const data=await fetchPage(cursor);
  if(!isCurrent())return null;
  if(!data||data.page!==cursor||!Array.isArray(data.matches)||typeof data.hasMore!=='boolean')
   throw Error(tr('O servidor devolveu uma página de jogos inválida. Atualiza novamente.'));
  for(const match of data.matches){
   if(!match||!Number.isSafeInteger(match.id)||match.id<=0)
    throw Error(tr('O servidor devolveu um jogo inválido.'));
   if(seenIds.has(match.id))continue;
   seenIds.add(match.id);
   matches.push(match);
  }
  lastPage=data.page;
  hasMore=data.hasMore;
  if(!hasMore)break;
  if(data.matches.length===0)throw Error(tr('A paginação dos jogos não avançou.'));
  cursor++;
 }
 return {matches,page:lastPage,hasMore};
}
/** Validate the first page as well as subsequent pages before displaying server results. */
function validateFixturePage(response,expectedPage){
 if(!Number.isSafeInteger(expectedPage)||expectedPage<0||expectedPage>9999
  ||!response||response.page!==expectedPage||!Array.isArray(response.matches)
  ||typeof response.hasMore!=='boolean')
  throw Error(tr('O servidor devolveu uma página de jogos inválida. Volta a sincronizar.'));
 if(response.hasMore&&response.matches.length===0)
  throw Error(tr('A paginação dos jogos não avançou. Volta a sincronizar.'));
 const seen=new Set();
 for(const match of response.matches){
  if(!match||!Number.isSafeInteger(match.id)||match.id<=0)
   throw Error(tr('O servidor devolveu um jogo inválido. Volta a sincronizar.'));
  if(seen.has(match.id))
   throw Error(tr('O servidor devolveu jogos repetidos na mesma página. Volta a sincronizar.'));
  seen.add(match.id);
 }
 return response;
}
function validateFirstFixturePage(response){return validateFixturePage(response,0);}
/** Refuse a broken next-page cursor before enabling the league close action. */
function validateNextFixturePage(response,expectedPage){
 if(!Number.isSafeInteger(expectedPage)||expectedPage<1)
  throw Error(tr('Paginação do calendário inválida.'));
 return validateFixturePage(response,expectedPage);
}
module.exports={reconcileVisibleFixtures,validateFirstFixturePage,validateNextFixturePage};
