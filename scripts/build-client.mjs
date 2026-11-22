import {build} from 'esbuild';
import {readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const temp=path.join(root,'.space-client-build.cjs');
const result=await build({entryPoints:[path.join(root,'client-src/index.jsx')],outfile:temp,bundle:true,format:'cjs',platform:'browser',target:'es2020',jsx:'automatic',minify:true,metafile:true,external:['react','react-dom','react/jsx-runtime'],logLevel:'info'});
// A second React copy would break hooks and split context; fail the build instead.
const packaged=Object.keys(result.metafile.inputs).filter(input=>/(?:^|\/)node_modules\/(?:react|react-dom)(?:\/|$)/.test(input));
if(packaged.length) throw new Error(`Refusing to bundle React into the client: ${packaged.join(', ')}`);

const cssPath=path.join(root,'.space-client-build.css');
const [code,css]=await Promise.all([readFile(temp,'utf8'),readFile(cssPath,'utf8')]);
// The wrapper's require is the host module table; React must stay external there.
if(!/require\(["']react["']\)/.test(code)||!/require\(["']react\/jsx-runtime["']\)/.test(code)) throw new Error('Client bundle must require the host React runtime');
if(/react-dom/.test(code)) throw new Error('Client bundle must not contain react-dom');
const wrapped=`window.__ModuleLoader__.load({id:'@local/dsh-space',factory(require){const module={exports:{}}; (function(module,exports,require){\n${code}\n})(module,module.exports,require);const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);return module.exports;}});\n`;
await writeFile(path.join(root,'client.js'),wrapped);await Promise.all([rm(temp),rm(cssPath)]);
