'use strict';
/** Convocatória: same envelope as the server (SessionCallUp.java) and the web. */
const PREFIX='[JYNLO:SESSION:1]';
const FORMAT=/^\[JYNLO:SESSION:1\]([1-9][0-9]{0,14})$/;
function encodeCallUp(id){return Number.isSafeInteger(id)&&id>0?PREFIX+id:'';}
function readCallUp(text){
 const match=typeof text==='string'?FORMAT.exec(text.trim()):null;
 if(!match)return null;
 const id=Number(match[1]);
 return Number.isSafeInteger(id)?id:null;
}
function isCallUpText(text){return typeof text==='string'&&text.trim().startsWith(PREFIX);}
module.exports={encodeCallUp,readCallUp,isCallUpText,CALLUP_PREFIX:PREFIX};
