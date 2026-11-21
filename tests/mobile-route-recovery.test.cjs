'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('unknown deep links show a recoverable screen with an internal home route',()=>{
 const code=read('app/+not-found.tsx');
 assert.match(code,/export default function NotFoundScreen/);
 assert.match(code,/router\.replace\('\/\(tabs\)'\)/);
 assert.match(code,/accessibilityRole="button"/);
 assert.match(code,/O link pode ter expirado/);
 assert.doesNotMatch(code,/Linking\.openURL|WebView|eval\(/);
});
test('root layout registers a route error boundary',()=>{
 const code=read('app/_layout.tsx');
 assert.match(code,/export function ErrorBoundary\(props:ErrorBoundaryProps\)/);
 assert.match(code,/<RouterErrorBoundary \{\.\.\.props\}\/>/);
 assert.match(code,/reportClientError\(props\.error,\{fatal:true\}\)/);
 assert.match(code,/<AuthProvider><Navigation\/><\/AuthProvider>/);
});
