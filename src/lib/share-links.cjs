// Links to share on WhatsApp and other apps. The API's share page gives link previews a real card
// (sport, place, time, free spots) and sends people straight on to jynlosports.com.
const SHARE_API='https://api.jynlosports.com/api/share';
const positiveId=id=>{const n=Number(id);if(!Number.isInteger(n)||n<1)throw Error('id inválido');return n;};
const sessionShareUrl=id=>`${SHARE_API}/sessions/${positiveId(id)}`;
const communityShareUrl=id=>`${SHARE_API}/communities/${positiveId(id)}`;
module.exports={SHARE_API,sessionShareUrl,communityShareUrl};
