function validAssociationProof(edge,proof){
  if(proof.method!=='frontmatter'||![edge.source,edge.target].includes(proof.source))return false;
  const other=proof.source===edge.source?edge.target:edge.source;
  const allowed={linkedInstitutions:'institutions',linkedPeople:'people',linkedExhibitions:'exhibitions',linkedConcepts:'concepts',linkedWriting:'writing',curators:'people'};
  const sourceType=proof.source.split(':')[0];
  const targetType=Object.hasOwn(allowed,proof.field)?allowed[proof.field]:null;
  return ['people','institutions','exhibitions','concepts','writing'].includes(sourceType)&&!!targetType&&other.startsWith(targetType+':')&&(proof.field!=='curators'||sourceType==='exhibitions');
}
import { EMERALD } from './emerald-palette.mjs';
import { cubicBezierAt } from './relation-flow.mjs';

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
      const radial = normalize(origin.map((value, i) => value - center[i]));
      const axis = Math.abs(radial[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
      const tangent = normalize([radial[1] * axis[2] - radial[2] * axis[1],
        radial[2] * axis[0] - radial[0] * axis[2], radial[0] * axis[1] - radial[1] * axis[0]]);
      for (const [index, id] of ids.entries()) {
        const angle = ids.length === 1 ? 0 : ((index / (ids.length - 1)) - .5) * 1.7;
        const distance = linked.length === 1 ? .15 : .10;
        const rest = origin.map((value, i) => value + distance * (radial[i] * Math.cos(angle) + tangent[i] * Math.sin(angle)));
        additions.set(id, { origin, rest, wave });
      }
    }
    for (const id of eligible) {
      positioned.set(id, additions.get(id).rest);
      remaining.splice(remaining.indexOf(id), 1);
    }
    wave++;
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

export function currentProjection(layer, coords, elapsed, reduced) {
  const points = new Map();
  for (const [id, {origin, rest, wave, previous}] of layer.additions) {
    const delay = previous ? 0 : wave * 650;
    const age = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - delay) / 2200));
    const blend = age * age * (3 - 2 * age);
    const from = previous?.point || origin;
    const startGrowth = previous?.growth || 0;
    const growth = startGrowth + (1 - startGrowth) * blend;
    points.set(id, { point: coords(rest.map((value, i) => from[i] + (value - from[i]) * blend)), growth });
  }
  return points;
}

export function drawCurrentResearch(ctx, layer, points, baselinePoint, { mode, zoom, clock, reduced, selected }) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const {from, to} of layer.edges) {
    const a = points.get(from) || {point: baselinePoint(from), growth: 1};
    const b = points.get(to) || {point: baselinePoint(to), growth: 1};
    const opacity = Math.min(a.growth, b.growth);
    if (!a.point || !b.point || !opacity) continue;
    const p = a.point, q = b.point;
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const c1 = [p[0] + dx / 3 - dy * .08, p[1] + dy / 3 + dx * .08];
    const c2 = [q[0] - dx / 3 - dy * .08, q[1] - dy / 3 + dx * .08];
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.bezierCurveTo(...c1, ...c2, q[0], q[1]);
    ctx.lineWidth = .48;
    ctx.strokeStyle = 'rgba(' + EMERALD.traces.living + ',' + opacity * (mode === 'Growth' ? .25 : .17) + ')';
    ctx.stroke();
    if (mode === 'Movement' && !reduced) {
      const glint = cubicBezierAt(p, c1, c2, q, (clock / 6500) % 1);
      ctx.beginPath();
      ctx.arc(glint[0], glint[1], .8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + EMERALD.nodes.selected + ',' + opacity * .42 + ')';
      ctx.fill();
    }
  }
  for (const [id, {point, growth}] of points) {
    if (!growth) continue;
    const kind = id.split(':')[0];
    const radius = Math.min(5, Math.pow(zoom / .65, .23) * (mode === 'Growth' ? 1.45 : 1.17));
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
