const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseFavoriteSports,normalizeCatalog,toggleFavoriteSport,validateFavoriteSports,filterSports}=require('../src/lib/favorite-sports.cjs');
const editor=untranslate(fs.readFileSync(path.join(__dirname,'../app/edit-profile.tsx'),'utf8'));
test('catalog is authoritative and deduplicated with deterministic sorting',()=>{
 assert.deepEqual(normalizeCatalog(['Karting','Padel','Karting','Futebol']),['Futebol','Karting','Padel']);
 assert.throws(()=>normalizeCatalog([]),/catálogo/);
 assert.throws(()=>normalizeCatalog(['Padel',null]),/catálogo/);
});
test('selection is a CSV of official backend names, with no invented sports',()=>{
 const catalog=['Futebol','Karting','Padel'];
 assert.equal(toggleFavoriteSport('', 'Karting',catalog),'Karting');
 assert.equal(toggleFavoriteSport('Karting','Padel',catalog),'Karting,Padel');
 assert.equal(toggleFavoriteSport('Karting,Padel','Karting',catalog),'Padel');
 assert.throws(()=>toggleFavoriteSport('Padel','Não existe',catalog),/desconhecida/);
 assert.deepEqual(parseFavoriteSports(' Karting, Pad el, Karting '),['Karting','Pad el']);
 assert.equal(validateFavoriteSports('Padel,Karting',catalog),null);
 assert.match(validateFavoriteSports('Ténis',catalog),/antigas/);
 assert.match(validateFavoriteSports('Padel',[]),/catálogo/);
});
test('search ignores diacritics and native editor blocks saves without catalog',()=>{
 assert.deepEqual(filterSports(['Ténis','Padel','Esgrima'],'tenis'),['Ténis']);
 assert.match(editor,/\/api\/profile\/sports-catalog/);
 assert.match(editor,/Promise\.all\(/);
 assert.match(editor,/catalogReady/);
 assert.match(editor,/validateFavoriteSports/);
 assert.match(editor,/accessibilityRole="checkbox"/);
 assert.doesNotMatch(editor,/label:'Desportos favoritos \(catálogo Jynlo\)'/);
});
