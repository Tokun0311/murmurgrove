function validAssociationProof(edge,proof){
  if(proof.method!=='frontmatter'||![edge.source,edge.target].includes(proof.source))return false;
  const other=proof.source===edge.source?edge.target:edge.source;
  const allowed={linkedInstitutions:'institutions',linkedPeople:'people',linkedExhibitions:'exhibitions',linkedConcepts:'concepts',linkedWriting:'writing',curators:'people'};
  const sourceType=proof.source.split(':')[0];
  const targetType=Object.hasOwn(allowed,proof.field)?allowed[proof.field]:null;
  return ['people','institutions','exhibitions','concepts','writing'].includes(sourceType)&&!!targetType&&other.startsWith(targetType+':')&&(proof.field!=='curators'||sourceType==='exhibitions');
}
import { EMERALD } from './emerald-palette.mjs';
import { cubicBezierAt, flowSamplesForRelation } from './relation-flow.mjs';
import { breathingTime, opticalTime } from './movement-pacing.mjs';
import { hashId } from './quiet-particles.mjs';

import { mangroveControls } from './organic-interaction.mjs';
export function organicPosition(p,time,mode,entry,main=true){
 const breathClock=breathingTime(time,mode),waveClock=opticalTime(time,mode);
 const depth=entry.density,phase=Math.atan2(entry.tangent[1],entry.tangent[0]);
 // Traveling, space-dependent direction-field phase: neighbors do not all shake in place.
 // The configured Movement wave clock keeps a low base frequency for legible propagation.
 const localWave=Math.sin(waveClock*.18 - p[0]*3.5 - p[1]*1.7 + phase*.22);
 const breathing=Math.sin(breathClock*.32+phase*.20)*(.0022+Math.min(.005,depth*.00025));
 const amplitude=main?(mode==='Movement'?.0054:.0045):.0028;
 const direction=entry.tangent;
 // Deliberately slow the tiny node displacement: the fast directional flow lives
 // on source-backed Bézier curves, not in untrackable high-frequency jitter.
 const u=Math.sin(breathClock*.43+phase+p[0]*2.8+p[2]*.7);
 const v=Math.cos(breathClock*.38+phase*.9+p[1]*3.4);
 return [p[0]+direction[1]*amplitude*(.45*u+.55*localWave)+direction[0]*breathing,
  p[1]-direction[0]*amplitude*(.45*v+.55*localWave)+direction[1]*breathing,
  p[2]+(main?amplitude*.40:amplitude*.10)*localWave];
}

const kinds = { exhibitions: 'exhibition', people: 'person', institutions: 'institution', concepts: 'concept', writing: 'writing' };
const average = points => [0, 1, 2].map(axis => points.reduce((sum, p) => sum + p[axis], 0) / points.length);
const normalize = vector => { const length = Math.hypot(...vector); return length ? vector.map(value => value / length) : [1, 0, 0]; };
export const edgeKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;

export function readCurrentResearch(graph, {excludedIds=new Set()}={}) {
  if (graph?.schema !== 'murmurgrove.current-research.1' ||
      graph.provenance !== 'DERIVED_FROM_PUBLISHED_ARCHIVE_NOT_A_LIVED_BODY' ||
      !Array.isArray(graph.records) || !Array.isArray(graph.relations)) throw new Error('Invalid public research projection');
  const records = new Map();
  const keys = new Map();
  for (const row of graph.records) {
    const kind = Object.hasOwn(kinds, row.type) && kinds[row.type];
    if (!kind || typeof row.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) ||
        row.key !== row.type + ':' + row.id || row.path !== '/' + row.type + '/' + row.id + '/' ||
        typeof row.title !== 'string' || !row.title.trim() || !/^[a-f0-9]{64}$/.test(row.contentHash) ||
        records.has(kind + ':' + row.id)) throw new Error('Invalid public research record');
    const id = kind + ':' + row.id;
    if(excludedIds.has(id)||row.engagement==='planned')continue; // Frozen quarantine is not promoted by current metadata.
    keys.set(row.key, id);
    records.set(id, { id, kind, title: row.title, path: row.path, occurredOn: row.engagement==='researched'?null:row.date, researchOn:row.researchOn||null, engagement:row.engagement||null,
      aliases: Array.isArray(row.aliases) ? row.aliases.filter(alias => typeof alias === 'string') : [] });
  }
  if (!records.size) throw new Error('Empty public research projection');
  const relations = [];
  const seen = new Set();
  for (const edge of graph.relations) {
    const from = keys.get(edge.source), to = keys.get(edge.target);
    const primary = edge.kind === 'recorded-link' && edge.source?.startsWith('exhibitions:');
    const association=edge.kind==='archive-association';
    const evidenced = Array.isArray(edge.provenance) && edge.provenance.some(proof =>
      primary ? proof.method === 'frontmatter' && keys.has(proof.source) : association ? validAssociationProof(edge,proof) :
        proof.method === 'reviewed-claim' && proof.claimId && proof.evidence && proof.reason);
    if (!from || !to || from === to || !evidenced) continue;
    const key = from + '|' + to + '|' + edge.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    relations.push({ from, to, kind: edge.kind });
  }
  return { records, relations, pairKeys:new Set(relations.map(e=>edgeKey(e.from,e.to))) };
}

// Extend only components with a path to an existing optical anchor. Each wave
// uses positions established before that wave. No changes to baseline geometry.
export function placeCurrentResearch({records, relations}, anchors, baselineLinks) {
  const neighbors = new Map([...records.keys()].map(id => [id, new Set()]));
  for (const {from, to} of relations) {
    neighbors.get(from).add(to);
    neighbors.get(to).add(from);
  }
  const positioned = new Map(anchors);
  const additions = new Map();
  const remaining = [...records.keys()].filter(id => !anchors.has(id)).sort();
  const center = average([...anchors.values()]);
  let wave = 0;
  while (anchors.size && remaining.length) {
    const eligible = remaining.filter(id => [...neighbors.get(id)].some(other => positioned.has(other)));
    if (!eligible.length) break;
    const siblings = new Map();
    for (const id of eligible) {
      const linked = [...neighbors.get(id)].filter(other => positioned.has(other)).sort();
      const groupKey = linked.join('|');
      if (!siblings.has(groupKey)) siblings.set(groupKey, {linked, ids: []});
      siblings.get(groupKey).ids.push(id);
    }
    for (const {linked, ids} of siblings.values()) {
      const origin = average(linked.map(id => positioned.get(id)));
      // Distribute into the existing body's volume, biased toward actual links.
      const base = [...anchors.values()];
      const min=[0,1,2].map(k=>Math.min(...base.map(p=>p[k])));
      const max=[0,1,2].map(k=>Math.max(...base.map(p=>p[k])));
      const span=Math.hypot(...max.map((v,k)=>v-min[k]));
      const occupied=[...positioned.values(),...[...additions.values()].map(a=>a.rest)];
      const unit=key=>(hashId(key)+.5)/4294967296;
      const frac=x=>x-Math.floor(x);
      for(const id of ids){
        const seed=unit(id+'|volume');let rest,best=-Infinity;
        for(let j=0;j<64;j++){
          const anchor=base[Math.floor(frac(seed+j*.61803398875)*base.length)];
          const mix=.22+.65*frac(unit(id+'|mix')+j*.754877666);
          const candidate=origin.map((v,k)=>v*(1-mix)+anchor[k]*mix+(frac(unit(id+'|axis'+k)+j*(.569840291+k*.117))*2-1)*span*.055);
          let nearest=span;
          for(const p of occupied)nearest=Math.min(nearest,Math.hypot(...p.map((v,k)=>v-candidate[k])));
          const distance=Math.hypot(...candidate.map((v,k)=>v-origin[k]));
          const score=Math.min(nearest,span*.055)-distance*.065+span*.008*unit(id+'|candidate'+j);
          if(score>best){best=score;rest=candidate;}
        }
        occupied.push(rest);additions.set(id,{origin,rest,wave});
      }
    }
    for (const id of eligible) {
      positioned.set(id, additions.get(id).rest);
      remaining.splice(remaining.indexOf(id), 1);
    }
    wave++;
  }
  // Same local direction/density construction used by the original body.
  for(const [id,placement] of additions){
    const p=placement.rest,tangent=[0,0,0];let density=0;
    for(const other of neighbors.get(id)){
      const q=positioned.get(other);if(q)for(let k=0;k<3;k++)tangent[k]+=q[k]-p[k];
    }
    for(const [other,q] of positioned){if(other===id)continue;
      const d2=q.reduce((sum,v,k)=>sum+(v-p[k])**2,0);
      if(d2>=.55**2)continue;const weight=Math.exp(-d2/(2*(.55*.47)**2));density+=weight;
      for(let k=0;k<3;k++)tangent[k]+=(q[k]-p[k])*weight*.24;
    }
    placement.field={tangent:normalize(tangent),density};
  }
  const baseline = new Set(baselineLinks.map(edge => edgeKey(edge.from, edge.to)));
  const visible = new Set(baseline);
  const activity = new Map();
  for (const {from, to} of relations) for (const id of [from, to]) {
    activity.set(id, (activity.get(id) || 0) + 1);
  }
  const edges = relations.filter(edge => {
    const pair = edgeKey(edge.from, edge.to);
    if (!positioned.has(edge.from) || !positioned.has(edge.to) || visible.has(pair)) return false;
    visible.add(pair);
    return true;
  });
  return { additions, edges, activity, unplaced: remaining.length };
}

export function currentProjection(layer, coords, elapsed, reduced, {animate=false, time=0, mode='Whole', motion=null}={}) {
  const points = new Map();
  const breath=breathingTime(time,mode), waveClock=opticalTime(time,mode);
  for (const [id, {origin, rest, wave, previous, field}] of layer.additions) {
    const delay = previous ? 0 : wave * 650;
    const age = reduced || !animate ? 1 : Math.max(0, Math.min(1, (elapsed - delay) / 2200));
    const blend = age * age * (3 - 2 * age);
    const from = previous?.point || origin;
    const growth = (previous?.growth || 0) + (1 - (previous?.growth || 0)) * blend;
    const p=rest.map((value,i)=>from[i]+(value-from[i])*blend);
    const moving=reduced?p:organicPosition(p,time,mode,field||{tangent:[1,0,0],density:0});
    points.set(id,{point:motion&&!reduced?motion(coords(p),coords(moving)):coords(p),growth});
  }
  return points;
}

export function drawCurrentResearch(ctx, layer, points, baselinePoint, { mode, zoom, clock, time=0, reduced, selected, field=()=>[0,0] }) {
  // MURMURGROVE_STABILITY_20261127
  const transform=ctx.getTransform();
  const w=ctx.canvas.width/Math.max(.01,transform.a),h=ctx.canvas.height/Math.max(.01,transform.d);
  const off=(x,y,r)=>x+r<0||y+r<0||x-r>w||y-r>h;
  ctx.clearRect(0, 0, w, h);
  let index=0;
  for (const {from, to} of layer.edges) {
    const flowIndex=index++;
    const a = points.get(from) || {point: baselinePoint(from), growth: 1};
    const b = points.get(to) || {point: baselinePoint(to), growth: 1};
    const opacity = Math.min(a.growth, b.growth);
    if (!a.point || !b.point || !opacity) continue;
    const p = a.point, q = b.point;
    const [c1,c2]=mangroveControls(p,q,field(from),field(to),1,mode,breathingTime(time,mode));
    // A Bezier curve stays within its control-point convex hull.
    if(Math.max(p[0],q[0],c1[0],c2[0]) < -2 || Math.min(p[0],q[0],c1[0],c2[0]) > w+2 || Math.max(p[1],q[1],c1[1],c2[1]) < -2 || Math.min(p[1],q[1],c1[1],c2[1]) > h+2)continue;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.bezierCurveTo(...c1, ...c2, q[0], q[1]);
    ctx.lineWidth = .48;
    ctx.strokeStyle = 'rgba(' + EMERALD.traces.living + ',' + opacity * (mode === 'Growth' ? .25 : .17) + ')';
    ctx.stroke();
    if(!reduced)for(const sample of flowSamplesForRelation(flowIndex,time,mode)){
      const glint=cubicBezierAt(p,c1,c2,q,sample.t);
      if(off(glint[0],glint[1],2))continue;
      ctx.beginPath();ctx.arc(glint[0],glint[1],sample.radius*Math.pow(zoom/.65,.12),0,Math.PI*2);
      ctx.fillStyle='rgba('+EMERALD.traces.particle+','+opacity*sample.alpha+')';ctx.fill();
    }
  }
  for (const [id, {point, growth}] of points) {
    if (!growth) continue;
    const kind = id.split(':')[0];
    const radius = Math.min(5, Math.pow(zoom / .65, .23) * (mode === 'Growth' ? 1.45 : 1.17));
    if(off(point[0],point[1],radius+7))continue;
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + (EMERALD.nodes[kind] || EMERALD.nodes.person) + ',' + growth * .55 + ')';
    ctx.fill();
    if (id === selected) {
      ctx.beginPath();
      ctx.arc(point[0], point[1], radius + 5.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + EMERALD.nodes.selected + ',.76)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  for (const [id, count] of layer.activity) {
    const current = points.get(id);
    const point = current?.point || baselinePoint(id);
    if (!point || current?.growth === 0) continue;
    const [x,y] = point;
    const radius = 2.2 * Math.min(17, 4 + Math.log1p(count) * 3.1);
    if(off(x,y,radius))continue;
    const ebb = reduced ? 1 : .9 + .1 * Math.sin(clock / 11000 + x * .001);
    const alpha = (.014 + Math.min(.042, count * .004)) * ebb * (current?.growth ?? 1);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,136,78,' + alpha + ')');
    gradient.addColorStop(1, 'rgba(0,136,78,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
