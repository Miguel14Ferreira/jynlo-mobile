'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const picker=fs.readFileSync(path.join(__dirname,'../src/components/BirthDatePicker.tsx'),'utf8');

test('birth year picker pages through a bounded range rather than 103 scrolling items',()=>{
 assert.match(picker,/YEAR_PAGE_SIZE=20/);
 assert.match(picker,/YEARS\.slice\(yearPage\*YEAR_PAGE_SIZE,\(yearPage\+1\)\*YEAR_PAGE_SIZE\)/);
 assert.match(picker,/setYearPage\(year\?Math\.floor\(\(MAX_YEAR-year\)\/YEAR_PAGE_SIZE\):0\)/);
 assert.match(picker,/setYearPage\(page=>Math\.min\(page\+1,Math\.ceil\(YEARS\.length\/YEAR_PAGE_SIZE\)-1\)\)/);
 assert.match(picker,/setYearPage\(page=>Math\.max\(0,page-1\)\)/);
});
test('accessible year navigation stays bounded and preserves date and age validation',()=>{
 assert.match(picker,/accessibilityLabel="Anos mais antigos"/);
 assert.match(picker,/accessibilityLabel="Anos mais recentes"/);
 assert.match(picker,/disabled=\{yearPage===0\}/);
 assert.match(picker,/disabled=\{\(yearPage\+1\)\*YEAR_PAGE_SIZE>=YEARS\.length\}/);
 assert.match(picker,/validAdultDate\(iso\)/);
 assert.match(picker,/onChange\(accepted\?iso:''\)/);
});
