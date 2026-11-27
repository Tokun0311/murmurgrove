import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||process.cwd());
const file=path.join(root,'public/murmurgrove/organism/viewer.mjs');
try {
 const original=fs.readFileSync(file,'utf8');
 const crlf=original.includes('\r\n');let s=original.replace(/\r\n/g,'\n');
 const marker='// CAMERA_MEMORY_RESTORED_20261127';
 if(s.includes(marker)){console.log('Camera fix already applied.');process.exit(0);}
 function replace(a,b){if(s.split(a).length!==2)throw Error('Source mismatch; no files changed.');s=s.replace(a,b);}
 replace("  let desktopReload=false;\n  try{const owner=window.parent!==window?window.parent:window;desktopReload=!MOBILE_HOME&&owner.performance.getEntriesByType('navigation')[0]?.type==='reload';}catch{}",'  '+marker);
 replace('  }else if(desktopReload||!storedMemory()){','  }else if(!storedMemory()){');
 // Use a fresh entrance only when there is no usable saved camera; retain the original first-visit semantics otherwise.
 replace("   entrance=null;zoom=DEFAULT_ZOOM;angle=ENTRANCE_TARGET_ANGLE;\n   elevation=ENTRANCE_TARGET_ELEVATION;pan=[0,0];mode='Whole';","   if(!locate){prepareEntrance();markEntranceSeen();}\n   else {entrance=null;zoom=DEFAULT_ZOOM;angle=ENTRANCE_TARGET_ANGLE;\n    elevation=ENTRANCE_TARGET_ELEVATION;pan=[0,0];mode='Whole';}");
 // Validate stored angle and elevation as a unit before mutating camera state.
 replace(" if(Number.isFinite(s.angle))angle=s.angle;if(Number.isFinite(s.elevation))elevation=cl(s.elevation,-1.2,1.2);"," if(!Number.isFinite(s.angle)||!Number.isFinite(s.elevation))return false;\n angle=s.angle%(2*Math.PI);elevation=cl(s.elevation,-1.2,1.2);");
 const next=crlf?s.replace(/\n/g,'\r\n'):s;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'murmur-camera-'));
 try{const p=path.join(temp,'viewer.mjs');fs.writeFileSync(p,next);const c=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(c.status!==0)throw Error(c.stderr||'Syntax check failed');}finally{fs.rmSync(temp,{recursive:true,force:true});}
 const backup=path.join(root,'.murmurgrove-camera-backup-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'viewer.mjs'),original);fs.writeFileSync(file,next);
 console.log('Patched 1 file. Camera memory restored.');console.log('Backup: '+backup);console.log('Commit only public/murmurgrove/organism/viewer.mjs');
}catch(e){console.error(e.message);process.exitCode=1;}
