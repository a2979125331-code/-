const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
http.createServer((req,res)=>{const name=req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].slice(1);if(!['index.html','styles.css','engine.js','app.js'].includes(name)){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',types[path.extname(name)]+'; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,name)));}).listen(8000,'127.0.0.1',()=>console.log('http://127.0.0.1:8000'));
