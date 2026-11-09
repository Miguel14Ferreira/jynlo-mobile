'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {giphyImageUrl}=require('../src/lib/chat-giphy.cjs');

test('renders Jynlo GIPHY message from validated id',()=>{
 assert.equal(giphyImageUrl('[JYNLO:GIPHY:1]'+JSON.stringify({id:'XdUMQuuiaAEkOUtezd',p:'https://giphy.com/gifs/animated-thumbs-up'})),
  'https://media.giphy.com/media/XdUMQuuiaAEkOUtezd/giphy.gif');
});
test('never trusts external URLs or malformed IDs',()=>{
 assert.equal(giphyImageUrl('normal message'),null);
 assert.equal(giphyImageUrl('[JYNLO:GIPHY:1]{'),null);
 assert.equal(giphyImageUrl('[JYNLO:GIPHY:1]'+JSON.stringify({id:'../../bad',p:'https://evil.example'})),null);
 assert.equal(giphyImageUrl('[JYNLO:GIPHY:1]'+JSON.stringify({p:'https://evil.example'})),null);
});
