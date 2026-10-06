// Standalone local preview. Serve only the map's public allowlisted assets.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  try {
    const url=new URL(request.url,'http://localhost');
    if (url.pathname === '/') {
      response.writeHead(302, {'Location':'https://ravradar.dk/'});
      response.end();return;
    }
    const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'jordrav.html';
    if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){
      response.writeHead(404);response.end();return;
    }
    const bytes=await fs.readFile(path.join(root,relative));
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
const port=Number(process.env.JORDRAV_PREVIEW_PORT||4178);
server.listen(port,'127.0.0.1',()=>console.log(`Jordrav preview: http://127.0.0.1:${port}/jordrav.html`));
