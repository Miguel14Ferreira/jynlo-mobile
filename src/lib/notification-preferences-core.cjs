'use strict';
/** Same types and labels as the web (notifications.component.ts / i18n). */
const PREFERENCE_GROUPS=Object.freeze([{"title": "Sessões", "types": [{"type": "SESSION_INVITE", "label": "Convites para sessões"}, {"type": "WAITLIST_PROMOTED", "label": "Vagas disponíveis"}, {"type": "SESSION_REMINDER", "label": "Lembretes antes dos jogos"}, {"type": "SESSION_MEETING_POINT_UPDATED", "label": "Mudanças no ponto de encontro"}, {"type": "SESSION_CANCELLED", "label": "Sessões canceladas"}, {"type": "SESSION_REMOVED", "label": "Remoção de sessões"}, {"type": "SESSION_POST_GAME_REVIEW", "label": "Avaliação após jogos"}, {"type": "PAYMENT_REMINDER", "label": "Lembretes de pagamento dos jogos"}, {"type": "ATTENDANCE_DISPUTE_ACCEPTED", "label": "Faltas justificadas aceites"}, {"type": "ATTENDANCE_DISPUTE_REJECTED", "label": "Faltas justificadas recusadas"}]}, {"title": "Comunidades", "types": [{"type": "COMMUNITY_INVITE", "label": "Convites para comunidades"}, {"type": "COMMUNITY_JOIN_REQUEST", "label": "Pedidos de adesão"}, {"type": "COMMUNITY_JOIN_ACCEPTED", "label": "Adesões aceites"}, {"type": "COMMUNITY_JOIN_REJECTED", "label": "Adesões recusadas"}]}, {"title": "Torneios", "types": [{"type": "TOURNAMENT_RESULT", "label": "Resultados dos teus jogos em torneios"}, {"type": "TOURNAMENT_LEADER", "label": "Mudanças de líder nos torneios"}]}, {"title": "Equipas", "types": [{"type": "TEAM_MEMBER_INVITE", "label": "Convites para equipas"}, {"type": "TEAM_ADMIN_TRANSFER", "label": "Transferências de administração das equipas"}, {"type": "TEAM_ADMIN_ASSIGNED", "label": "Confirmações de administração das equipas"}]}, {"title": "Social e mensagens", "types": [{"type": "CHAT_MESSAGE", "label": "Mensagens de chat"}, {"type": "SOCIAL_POST_LIKED", "label": "Gostos nas publicações"}, {"type": "SOCIAL_POST_COMMENTED", "label": "Comentários nas publicações"}, {"type": "SOCIAL_NEW_FOLLOWER", "label": "Novos seguidores"}, {"type": "FRIEND_REQUEST", "label": "Pedidos de amizade"}]}, {"title": "Outros", "types": [{"type": "VENUE_EDIT_DECISION", "label": "Decisões sobre alterações a recintos"}, {"type": "OTHER", "label": "Outros avisos da aplicação"}]}]);
const PREFERENCE_TYPES=Object.freeze(PREFERENCE_GROUPS.flatMap(g=>g.types.map(t=>t.type)));
/** Validates a server response; unknown types are kept so the app never drops web choices. */
function normalizePreferences(raw){
 if(!raw||typeof raw!=='object')throw Error('Preferências inválidas.');
 const list=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&/^[A-Z_]{2,60}$/.test(x)))].sort():[];
 return {inAppEnabled:raw.inAppEnabled!==false,emailEnabled:raw.emailEnabled!==false,
  disabledInAppTypes:list(raw.disabledInAppTypes),disabledEmailTypes:list(raw.disabledEmailTypes)};
}
function toggleType(prefs,channel,type,enabled){
 const key=channel==='email'?'disabledEmailTypes':'disabledInAppTypes';
 const set=new Set(prefs[key]);
 if(enabled)set.delete(type);else set.add(type);
 return {...prefs,[key]:[...set].sort()};
}
function samePreferences(a,b){return JSON.stringify(normalizePreferences(a))===JSON.stringify(normalizePreferences(b));}
module.exports={PREFERENCE_GROUPS,PREFERENCE_TYPES,normalizePreferences,toggleType,samePreferences};
