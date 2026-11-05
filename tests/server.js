// Tiny static server with Range support (video seeking). Usage: node tests/server.js <root> <port>
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]),port=+process.argv[3];
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.png':'image/png','.txt':'text/plain'};
http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';
 let base=root;if(u.startsWith('/__tmp/')){base=path.resolve(__dirname,'.tmp');u=u.slice(6)}
 const f=path.join(base,u);if(!f.startsWith(base)){r.writeHead(403);return r.end()}
 fs.stat(f,(e,s)=>{if(e||!s.isFile()){if(base!==root){const f2=path.join(root,u);return fs.stat(f2,(e2,s2)=>{if(e2||!s2.isFile()){r.writeHead(404);return r.end('nf')}send(f2,s2,q,r)})}r.writeHead(404);return r.end('nf')}send(f,s,q,r)})}).listen(port,()=>console.log('serving',root,port));
function send(f,s,q,r){  const h={'Content-Type':T[path.extname(f)]||'application/octet-stream','Accept-Ranges':'bytes'};
  const m=/bytes=(\d*)-(\d*)/.exec(q.headers.range||'');
  if(m){const a=m[1]?+m[1]:0,b=m[2]?+m[2]:s.size-1;h['Content-Range']=`bytes ${a}-${b}/${s.size}`;h['Content-Length']=b-a+1;r.writeHead(206,h);fs.createReadStream(f,{start:a,end:b}).pipe(r)}
  else{h['Content-Length']=s.size;r.writeHead(200,h);fs.createReadStream(f).pipe(r)}}
