'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {pickerMediaMime}=require('../src/lib/picker-media-format.cjs');

test('Android content URI without MIME uses the original filename',()=>{
 assert.equal(pickerMediaMime({type:'image',uri:'content://media/external/images/media/98',fileName:'holiday.JPG'}),'image/jpeg');
 assert.equal(pickerMediaMime({type:'image',uri:'content://com.android.providers.media.documents/document/image%3A23',fileName:'team.png'}),'image/png');
 assert.equal(pickerMediaMime({type:'video',uri:'content://media/external/video/media/21',fileName:'match.MP4'}),'video/mp4');
});

test('MIME metadata takes priority over potentially misleading filenames',()=>{
 assert.equal(pickerMediaMime({type:'image',uri:'content://provider/object',fileName:'pic.png',mimeType:'image/jpeg'}),'image/jpeg');
 assert.equal(pickerMediaMime({type:'video',uri:'content://provider/object',fileName:'movie.mp4',mimeType:'video/quicktime'}),null);
});

test('unsupported or mismatched Android media remains rejected',()=>{
 assert.equal(pickerMediaMime({type:'image',uri:'content://provider/object',fileName:'photo.heic'}),null);
 assert.equal(pickerMediaMime({type:'video',uri:'content://provider/object',fileName:'video.mov'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'content://provider/object',fileName:'video.mp4'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'content://provider/object',fileName:'unknown'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'file:///storage/emulated/0/photo.heic',fileName:'photo.jpg',mimeType:'image/jpeg'}),null);
});
