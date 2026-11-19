'use strict';
/** A failed request can still have been committed by the server.
 * Do not automatically resubmit or silently enable a second POST.
 */
function uncertainPostOutcome(message){
 if(typeof message!=='string')return false;
 return [
  'Não foi possível obter confirmação do servidor',
  'O envio demorou demasiado tempo',
  'O envio excedeu ',
  'Falha de ligação durante o envio',
  'O servidor respondeu',
  'O servidor não confirmou',
  'O servidor Jynlo não conseguiu confirmar o envio',
  'Verifica se foi publicado antes de repetires',
  'Consulta o perfil antes de repetir',
  'Confirma no perfil antes de repetir',
  'Confirma no perfil antes de repetires'
 ].some(fragment=>message.includes(fragment));
}
module.exports={uncertainPostOutcome};
