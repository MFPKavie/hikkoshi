import {parseBackup} from './core.mjs';
self.onmessage=async({data})=>{try{const result=await parseBackup(data.buffer,{name:data.name,progress:message=>postMessage({progress:message})});postMessage({result});}catch(error){postMessage({error:error.message||'The backup could not be read.'});}};
