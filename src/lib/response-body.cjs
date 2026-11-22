'use strict';
const {tr}=require('./i18n-core.cjs');

/**
 * Some APIs return 200 OK with no response body for successful mutations.
 * Response.json() would throw despite the operation having completed.
 * Never auto-retry a mutation after an invalid server response.
 */
class InvalidSuccessfulResponseError extends Error {
  constructor(){super(tr('Resposta inválida da Jynlo. Se alteraste dados, confirma o resultado antes de tentares novamente.'));this.name='InvalidSuccessfulResponseError';}
}
async function readSuccessfulResponse(response) {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (typeof text !== 'string' || text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidSuccessfulResponseError();
  }
}
/**
 * A reason the server wrote for people ("Já existe uma época ativa para esta
 * modalidade"). Technical text is never shown: the caller keeps its fallback.
 */
function userFacingMessage(value){
  if(typeof value!=='string')return null;
  const text=value.trim();
  if(text.length<4||text.length>240||!text.includes(' '))return null;
  if(/Exception|\.java|\bnull\b|could not|SQL|JDBC|org\.|java\.|com\.|[\[{<]/i.test(text))return null;
  if(/^(BAD REQUEST|FORBIDDEN|NOT FOUND|CONFLICT|INTERNAL SERVER ERROR)$/i.test(text))return null;
  return text;
}
async function readErrorMessage(response){
  try{
    const text=await response.text();
    if(!text)return null;
    const body=JSON.parse(text);
    return userFacingMessage(body&&typeof body==='object'?body.message:null);
  }catch{return null;}
}
module.exports={readSuccessfulResponse,InvalidSuccessfulResponseError,userFacingMessage,readErrorMessage};
