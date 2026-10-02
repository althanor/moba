import fs from 'node:fs';
import { createServer } from 'vite';
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true}});
try{
 const {compileContent}=await server.ssrLoadModule('/src/content/index.ts');
 const result=compileContent(JSON.parse(fs.readFileSync('content/m3-battle.json','utf8')),30);if(!result.ok)throw new Error(JSON.stringify(result.diagnostics));
 const c=result.catalog.certificate,p={id:'m3-debug-logical-v1',capacity:c.limit,startup:c.startupLimit,command:c.commandLimit,roots:c.rootCountLimit,queryTargets:c.maxUnits,hookDepth:c.maxHookDepth,units:c.maxUnits,statuses:c.maxStatusesGlobal,factQueue:c.factQueueLimit};
 fs.writeFileSync('content/m3-profile.json',JSON.stringify(p,null,2)+'\n');
 console.log(JSON.stringify({id:c.id,hash:result.catalog.contentHash,tick:c.tick,profile:p}));
}finally{await server.close();}
