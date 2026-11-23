// Texts the server stores in Portuguese on security notifications. The app shows
// them through t() so English users read them in English; any other text (user
// content, names) is shown exactly as received.
const SERVER_NOTIFICATION_TEXTS=Object.freeze([
 'Palavra-passe alterada',
 'A tua palavra-passe foi alterada. Se não foste tu, redefine-a imediatamente.',
 'Alteração de email',
 'O endereço de email associado à tua conta foi alterado. Se não foste tu, redefine imediatamente a tua palavra-passe.',
]);
function isServerNotificationText(value){return typeof value==='string'&&SERVER_NOTIFICATION_TEXTS.includes(value);}
module.exports={SERVER_NOTIFICATION_TEXTS,isServerNotificationText};
