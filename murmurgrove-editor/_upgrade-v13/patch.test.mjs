import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {patchEditor,patchHTML} from './install.mjs';
const ui=await fs.readFile(new URL('./inline-ui.js',import.meta.url),'utf8');
test('UI patch preserves v1.2 marker and replaces the old search-only UI',()=>{
 const old=`function setDirty(v=true){}\nfunction newRecord(){}\nasync function openRecord(slug,draft){try{}catch{}}\n// MURMURGROVE_EXHIBITION_FIRST_V12\nconst oldUI=true;\nfunction updateTitle(){}\nasync function publish(){try{}catch{}}\nfunction resetAnalysis(){$('analysis-section').hidden=state.type!=='exhibitions';}\n$('switch-record').addEventListener('click',()=>showResearch(false));`;
 const patched=patchEditor(old,ui);assert(patched.includes('MURMURGROVE_EDITOR_V13'));assert(patched.includes('MURMURGROVE_EXHIBITION_FIRST_V12'));assert(!patched.includes('oldUI'));assert(patched.includes('const issues=reviewIssues()'));assert(patched.includes('concept-options'));assert.throws(()=>patchEditor('bad source',ui));
});
test('HTML patch adds stages, status and optional analysis',()=>{
 const old=`editor v1.2 (local) editor v1.2 · exhibition-first<div id="alert" role="status" aria-live="polite" hidden></div><div class="bundle-phase">01 / CAPTURE</div><div class="bundle-phase">02 / CONNECT</div><p class="micro-copy">Search existing records or create and link new people, institutions and concepts here.</p><section class="analysis-section" id="analysis-section"></section><div class="bundle-phase">03 / PUBLISH</div><button>Save private draft</button><button>Publish to local Astro files</button>`;
 const patched=patchHTML(old);assert(patched.includes('editor v1.3 (local)'));assert(patched.includes('id="editor-review-status"'));assert(patched.includes('id="analysis-fold"'));assert(patched.includes('id="publish-phase"'));assert.throws(()=>patchHTML('bad source'));
});
