import {concentrationHistory,silentHistory,ruptureHistory,bulkImportHistory} from '../fixtures/stress-scenarios.mjs';
import {simulateEmergence,collectWork,buildDigestionEpisodes,resolveThresholds} from '../src/emergence.mjs';
import {simulateMorphology,microSignal} from '../src/dynamics.mjs';

function summary(label,events,time){
  const e=simulateEmergence(events,{asOf:time});
  console.log(`\n${label} (${time})`);
  console.log(JSON.stringify({hash:e.emergenceHash,coreCount:e.cores.length,
    cores:e.cores.slice(0,3).map(c=>({potential:c.potential,position:c.position})),
    geometry:e.geometryAudit,thresholds:e.thresholds.transitions.length,
    lastLeap:e.thresholds.transitions.at(-1)?.triggeredAt||null,
    shear:e.reconfiguration.changedGeometry,
    turnCount:e.reconfiguration.turns.length,
    islands:e.regions.islands.map(i=>({id:i.regionId,gap:i.negativeSpaceGap}))},null,2));
}
const biased=concentrationHistory();
summary('EXTREME BIAS, before concentration',biased,'2028-01-01T00:00:00Z');
summary('EXTREME BIAS, after concentration',biased,'2033-01-01T00:00:00Z');
const silent=silentHistory();
summary('SILENCE, before dormancy',silent,'2027-09-01T00:00:00Z');
summary('SILENCE, after seven years',silent,'2034-09-01T00:00:00Z');
const silentState=simulateMorphology(silent,{asOf:'2034-09-01T00:00:00Z'});
console.log('Dormant concept microSignal (two seconds):',
  microSignal(silentState,'concept:dormant-research','2034-09-01T00:00:00Z'),
  microSignal(silentState,'concept:dormant-research','2034-09-01T00:00:02Z'));
summary('RUPTURE, independent field',ruptureHistory(),'2038-03-12T00:00:00Z');
const bulk=bulkImportHistory(),asOf='2030-08-01T00:00:00Z';
const work=collectWork(bulk,{asOf}).work,episodes=buildDigestionEpisodes(work);
const resolved=resolveThresholds(episodes,{asOf});
console.log('\nBULK IMPORT (500 late encounters):',JSON.stringify({lifeWorkEntries:work.length,
  digestionEpisodes:episodes.length,thresholds:resolved.transitions.length,
  episodeWork:episodes[0]?.rawWork,saturatedEnergy:episodes[0]?.capacity,
  queuedEnergy:resolved.digestion.pendingWork},null,2));
