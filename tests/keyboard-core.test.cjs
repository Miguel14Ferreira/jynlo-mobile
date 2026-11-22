'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {keyboardOverlap,scrollToReveal}=require('../src/lib/keyboard-core.cjs');
test('overlap só conta a parte coberta pelo teclado',()=>{
 assert.equal(keyboardOverlap(0,800,500),300);
 assert.equal(keyboardOverlap(0,480,500),0); // a janela já encolheu
 assert.equal(keyboardOverlap(NaN,800,500),0);
});
test('campo tapado pelo teclado sobe até ficar visível',()=>{
 assert.equal(scrollToReveal(600,56,500,80),180); // 656 -> 476
 assert.equal(scrollToReveal(300,56,500,80),0);
 assert.equal(scrollToReveal(40,56,500,80),-64); // escondido em cima
});
test('campo muito alto: mostra pelo menos o início',()=>{
 assert.equal(scrollToReveal(200,1000,500,80),96);
});
