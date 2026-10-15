// Vite/Vitest resolve extensionless imports that native Node ESM cannot.
// Emit the server graph as Vercel does, then load and exercise it in a real Node
// process. No credentials or remote services are needed for this startup check.
import ts from "typescript";
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  mkdir,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const root = await mkdtemp(join(tmpdir(), "for-garden-api-"));
try {
  await writeFile(join(root, "package.json"), ' {"type":"module"}');
  for (const directory of ["api", "server", "shared"]) {
    await mkdir(join(root, directory));
    for (const file of await readdir(directory)) {
      if (!/\.(js|ts)$/.test(file)) continue;
      const source = await readFile(join(directory, file), "utf8");
      const output = file.endsWith(".ts")
        ? ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
            },
          }).outputText
        : source;
      await writeFile(
        join(root, directory, file.replace(/\.ts$/, ".js")),
        output,
      );
    }
  }
  await writeFile(
    join(root, "smoke.mjs"),
    `
 import assert from 'node:assert/strict';
 import notices from './api/notices.js';
 import site from './api/site.js';
 import preregister from './api/preregister.js';
 delete process.env.SUPABASE_URL;
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 function response(){let status,body;const res={setHeader(){},status(code){status=code;return res;},json(value){body=value;}};return {res,result:()=>({status,body})};}
 const settings=response();await site({method:'GET',headers:{}},settings.res);assert.equal(settings.result().status,200);
 const news=response();await notices({method:'GET',headers:{},url:'/api/notices?lang=ko'},news.res);assert.equal(news.result().status,200);assert(news.result().body.notices.length>0);
 const signup=response();await preregister({method:'GET',headers:{}},signup.res);assert.equal(signup.result().status,405);
 // Also exercise the configured DB path without allowing a network request.
 process.env.SUPABASE_URL='https://project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='runtime-test-only';
 globalThis.fetch=async()=>Response.json([{slug:'published',category:'notice',published_at:'2026-10-16T00:00:00Z',website_notice_translations:[{locale:'ko',title:'게시된 공지',summary:'',body:'본문'}]}]);
 const published=response();await notices({method:'GET',headers:{},url:'/api/notices?lang=ko'},published.res);assert.equal(published.result().status,200);assert.equal(published.result().body.notices[0].title,'게시된 공지');
 console.log('PASS: all 3 API modules load in native Node ESM; site/editorial news/published DB news and API guards execute');
 `,
  );
  process.stdout.write(
    execFileSync(process.execPath, [join(root, "smoke.mjs")], {
      encoding: "utf8",
      timeout: 15000,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
