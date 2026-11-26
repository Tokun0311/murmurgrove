import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {installV13} from '../_upgrade-v13/install.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(here,'..');
const mark='MURMURGROVE_EDITOR_V14';
const read=p=>fs.readFile(p,'utf8');
function one(s,a,b){const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('Unexpected source version: '+a.slice(0,85));return s.slice(0,i)+b+s.slice(i+a.length);}
export function patchServer(s){
 s=one(s,"'relatedInstitutions','exhibitionEnd','verification'","'relatedInstitutions','exhibitionStart','exhibitionEnd','verification'");
 s=one(s,"      if(fields.exhibitionEnd && !isDate(fields.exhibitionEnd))throw Object.assign(new Error('Invalid exhibition end date'),{status:422});",`      // ${mark}: optional dates, validated for both single and bundle publication.
      if(fields.exhibitionStart && !isDate(fields.exhibitionStart))throw apiError(422,'Invalid exhibition start date');
      if(fields.exhibitionEnd && !isDate(fields.exhibitionEnd))throw apiError(422,'Invalid exhibition end date');
      if(fields.exhibitionStart && fields.exhibitionEnd && fields.exhibitionStart>fields.exhibitionEnd)throw apiError(422,'Exhibition start must not be later than exhibition end.');`);
 return s;
}
export function patchEditor(s){
 s=one(s,"['exhibitionEnd','Exhibition end (optional)','date']","['exhibitionStart','Exhibition start (optional)','date'],['exhibitionEnd','Exhibition end (optional)','date']");
 s=one(s,"const fieldLabels={title:","// "+mark+"\nconst fieldLabels={exhibitionStart:'Start / 开始日期',exhibitionEnd:'End / 结束日期',title:");
 s=one(s,"function reviewIssues(){",`function validPeriodDate(value){if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
function periodIssue(){if(state.type!=='exhibitions')return '';const a=String(state.fields.exhibitionStart||''),b=String(state.fields.exhibitionEnd||'');if(a&&!validPeriodDate(a)||b&&!validPeriodDate(b))return '会期日期无效 / Invalid exhibition date';if(a&&b&&a>b)return '开始日期不能晚于结束日期 / Start must be on or before end';return '';}
function reviewIssues(){`);
 s=one(s,"return {missing,invalidId,pending};}","return {missing,invalidId,pending,periodError:periodIssue()};}");
 s=one(s,"const {missing,invalidId,pending}=reviewIssues();const problems=missing.length+Number(invalidId)+pending.length;","const {missing,invalidId,pending,periodError}=reviewIssues();const problems=missing.length+Number(invalidId)+pending.length+Number(!!periodError);");
 s=one(s,"status.dataset.status=problems?(attemptedPublish?'error':'attention'):'ready'","status.dataset.status=problems?(attemptedPublish||periodError?'error':'attention'):'ready'");
 s=one(s,"if(pending.length)messages.push(pending.length+' 个新档案仍需审核或关联');","if(pending.length)messages.push(pending.length+' 个新档案仍需审核或关联');if(periodError)messages.push(periodError);");
 s=one(s,"function refreshV13(){updateReviewStatus();highlightBundleReview();}",`function refreshV13(){updateReviewStatus();highlightBundleReview();const error=periodIssue();for(const k of ['exhibitionStart','exhibitionEnd']){const input=$('field-'+k);if(input){input.setAttribute('aria-invalid',String(!!error));input.closest('.form-field')?.classList.toggle('field-invalid',!!error);}}const notice=$('period-notice');if(notice){const a=state.fields.exhibitionStart,b=state.fields.exhibitionEnd,v=state.fields.visitedOn;const outside=!!v&&((!!a&&v<a)||(!!b&&v>b));notice.dataset.status=error?'error':outside?'attention':'neutral';notice.textContent=error|| (outside?'参观日期在已填写的会期之外，请确认（预展、闭幕后访问等情况仍可保存）。 / Check visit date; exceptions are allowed.':'两端均可留空，只知道一端也可以填写。 / Either date may be left blank.');}}`);
 s=one(s,"'verification','exhibitionEnd','reading'","'verification','reading'");
 s=one(s,"visitedOn:'Visit date · 参观日期',region:","visitedOn:'Visit date · 实际参观日期',exhibitionStart:'Start date · 开始日期（选填）',exhibitionEnd:'End date · 结束日期（选填）',region:");
 s=one(s," const optional=new Set(",` const period=el('section','v14-period');period.append(el('h3','form-label','Exhibition period / 展览会期'),el('p','micro-copy','展览对外开放的时间，不是你的实际参观日期。'));const dates=el('div','v14-period-dates'),notice=el('p','v14-period-notice');notice.id='period-notice';notice.setAttribute('role','status');period.append(dates,notice);
 const optional=new Set(`);
 s=one(s,"(optional.has(field[0])?advanced:box).append(node);}}","if(type==='exhibitions'&&['exhibitionStart','exhibitionEnd'].includes(field[0]))dates.append(node);else (optional.has(field[0])?advanced:box).append(node);}}\n if(type==='exhibitions')box.append(period);");
 s=one(s,"issues.missing.length||issues.invalidId||issues.pending.length","issues.missing.length||issues.invalidId||issues.pending.length||issues.periodError");
 s=one(s,"请先处理标红的必填项、Record ID 或待审核关联。","请先处理标红的必填项、会期、Record ID 或待审核关联。");
 return s;
}
export function patchHTML(s){
 s=one(s,'editor v1.3 (local)','editor v1.4 (local)');s=one(s,'editor v1.3 · clear workflow','editor v1.4 · clear workflow');
 s=one(s,'<div class="bundle-phase" id="capture-phase">','<section class="v14-section v14-capture" aria-labelledby="capture-phase"><div class="bundle-phase" id="capture-phase">');
 s=one(s,'<section id="connect-workspace">','</section><section id="connect-workspace" class="v14-section" aria-labelledby="connect-phase">');
 s=one(s,'<div class="bundle-phase">02 / CONNECT · 关联</div>','<div class="bundle-phase" id="connect-phase">02 / CONNECT · 关联</div>');
 s=one(s,'<div class="bundle-phase" id="publish-phase">','<section class="v14-section v14-publish" aria-labelledby="publish-phase"><div class="bundle-phase" id="publish-phase">');
 s=one(s,'    </form>\n    </div>','    </section>\n    </form>\n    </div>');
 return s;
}
export async function installV14(base){
 let server=await read(path.join(base,'server.mjs')),editor=await read(path.join(base,'assets/editor.js')),html=await read(path.join(base,'index.html')),css=await read(path.join(base,'assets/editor.css'));
 const flags=[server.includes(mark),editor.includes(mark),html.includes('editor v1.4 (local)'),css.includes(mark)];
 if(flags.every(Boolean)){console.log('Editor v1.4 ready.');return;}if(flags.some(Boolean))throw Error('Mixed v1.4 files. Restore private upgrade backup.');
 if(!editor.includes('MURMURGROVE_EDITOR_V13')||!html.includes('editor v1.3 (local)')){await installV13(base);server=await read(path.join(base,'server.mjs'));editor=await read(path.join(base,'assets/editor.js'));html=await read(path.join(base,'index.html'));css=await read(path.join(base,'assets/editor.css'));}
 if(!server.includes('MURMURGROVE_EXHIBITION_FIRST_V12')||!editor.includes('MURMURGROVE_EDITOR_V13')||!html.includes('editor v1.3 (local)'))throw Error('Unsupported or mixed v1.3 version.');
 const files=[['server.mjs',server,patchServer(server.replace(/\r\n/g,'\n'))],['assets/editor.js',editor,patchEditor(editor.replace(/\r\n/g,'\n'))],['index.html',html,patchHTML(html.replace(/\r\n/g,'\n'))],['assets/editor.css',css,css+'\n'+await read(path.join(here,'extra.css'))]];
 const tmp=await fs.mkdtemp(path.join(base,'.v14-check-'));try{for(const [f,old,next] of files){if(!/\.(mjs|js)$/.test(f))continue;const p=path.join(tmp,path.basename(f)+'.mjs');await fs.writeFile(p,next);const check=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}}finally{await fs.rm(tmp,{recursive:true,force:true});}
 const backup=path.join(base,'.private','editor-upgrade-backups','v1.3-'+new Date().toISOString().replace(/[:.]/g,'-'));for(const [f,old] of files){const p=path.join(backup,f);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,old,{flag:'wx'});}
 const done=[];try{for(const [f,old,next] of files){const p=path.join(base,f);if(await read(p)!==old)throw Error('File changed during upgrade: '+f);const t=p+'.v14-tmp';await fs.writeFile(t,next,{flag:'wx'});try{await fs.rename(t,p);}finally{await fs.rm(t,{force:true});}done.push([f,old]);}}catch(e){for(const [f,old] of done.reverse())await fs.writeFile(path.join(base,f),old);throw e;}
 console.log('Editor v1.4 installed. Backup: '+backup+'\nOnly local editor program files updated.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){try{await installV14(target);}catch(e){console.error('Upgrade stopped: '+e.message+'\nKeep the original folder and .private.');process.exitCode=1;}}
