/**
 * Murmurgrove Phase 1A: deterministic factual/archive and life-event protocol.
 * Does not generate geometry, infer research relationships, or write user files.
 * Node 22+, no dependencies. Synthetic fixtures only.
 */
import { createHash } from 'node:crypto';

export const SCHEMA = 'murmurgrove.event.v1';
const RECORD_KINDS = new Set(['concept', 'writing', 'exhibition', 'person', 'institution']);
const ARCHIVE_KINDS = new Set(['archive.record.upsert', 'archive.record.remove', 'archive.link.assert', 'archive.link.retract']);
const LIFE_KINDS = new Set(['life.encounter', 'life.writing', 'life.connection', 'life.reinterpretation']);
const ALL_KINDS = new Set([...ARCHIVE_KINDS, ...LIFE_KINDS]);
const KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-_]*$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function requireCondition(cond, message) { if (!cond) throw new Error(message); }
export function isDay(value) {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function isInstant(value) {
  return typeof value === 'string' && INSTANT.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
}
function validId(id) { return typeof id === 'string' && KEY.test(id); }
function checkKeys(value, keys, context) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), `${context} must be an object`);
  for (const k of Object.keys(value)) requireCondition(keys.includes(k), `${context} unexpected field: ${k}`);
}
export function validateEvent(e) {
  checkKeys(e, ['schema', 'seq', 'eventId', 'kind', 'recordedAt', 'effectiveAt', 'payload'], 'Event');
  requireCondition(e.schema === SCHEMA, `Unsupported schema: ${e.schema}`);
  requireCondition(Number.isSafeInteger(e.seq) && e.seq >= 1, 'seq must be a positive integer');
  requireCondition(typeof e.eventId === 'string' && /^evt:[a-z0-9_-]+$/.test(e.eventId), 'Bad eventId');
  requireCondition(ALL_KINDS.has(e.kind), `Unknown kind: ${e.kind}`);
  requireCondition(isInstant(e.recordedAt), 'recordedAt must be ISO-8601 UTC');
  requireCondition(e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload), 'Invalid payload');
  if (LIFE_KINDS.has(e.kind)) {
    requireCondition(isInstant(e.effectiveAt), 'Life event requires effectiveAt');
    // Phase 1A forbids backdating and scheduling biology. A later digestion
    // animation is not a future research event.
    requireCondition(e.effectiveAt === e.recordedAt, 'effectiveAt must equal recordedAt in v1');
    const {recordRefs, linkRefs = [], interpretedOn, ...rest} = e.payload;
    checkKeys(rest, ['note'], 'Life payload');
    requireCondition(Array.isArray(recordRefs) && recordRefs.length >= 1 && recordRefs.every(validId), 'Life event requires recordRefs');
    requireCondition(Array.isArray(linkRefs) && linkRefs.every(validId), 'Life linkRefs invalid');
    if (e.kind === 'life.reinterpretation') requireCondition(isDay(interpretedOn), 'reinterpretation needs interpretedOn');
    else requireCondition(interpretedOn === undefined, 'interpretedOn only allowed for reinterpretation');
  } else {
    requireCondition(e.effectiveAt === undefined, 'Archive maintenance cannot have effectiveAt');
    if (e.kind === 'archive.record.upsert') {
      checkKeys(e.payload, ['record', 'reason'], 'Record upsert payload');
      const r = e.payload.record;
      checkKeys(r, ['id', 'kind', 'title', 'occurredOn', 'occurredOnBasis', 'visibility'], 'Record');
      requireCondition(validId(r.id) && RECORD_KINDS.has(r.kind) && r.id.startsWith(r.kind + ':'), 'Bad record id/kind');
      requireCondition(typeof r.title === 'string' && r.title.trim().length > 0, 'Record title required');
      requireCondition(r.occurredOn === null || isDay(r.occurredOn), 'occurredOn must be date or null');
      requireCondition(['visit', 'authorship', 'encounter', 'other', 'unknown'].includes(r.occurredOnBasis), 'occurredOnBasis invalid');
      requireCondition(r.occurredOn !== null || r.occurredOnBasis === 'unknown', 'Unknown occurrence date needs unknown basis');
      requireCondition(['public', 'private'].includes(r.visibility), 'visibility invalid');
      requireCondition(['ingest', 'correction', 'metadata'].includes(e.payload.reason), 'reason invalid');
    } else if (e.kind === 'archive.record.remove') {
      checkKeys(e.payload, ['recordId', 'reason'], 'Record remove payload');
      requireCondition(validId(e.payload.recordId) && ['duplicate', 'invalid', 'withdrawn'].includes(e.payload.reason), 'Bad record remove');
    } else if (e.kind === 'archive.link.assert') {
      checkKeys(e.payload, ['link'], 'Link assert payload');
      const l = e.payload.link;
      checkKeys(l, ['id', 'from', 'to', 'strength', 'basis'], 'Link');
      requireCondition(validId(l.id) && validId(l.from) && validId(l.to) && l.from !== l.to, 'Bad link ids');
      requireCondition(Number.isFinite(l.strength) && l.strength > 0 && l.strength <= 1.6, 'Strength must be 0 < x <= 1.6');
      requireCondition(l.basis === 'explicit', 'Only explicitly asserted links in Phase 1A');
    } else if (e.kind === 'archive.link.retract') {
      checkKeys(e.payload, ['linkId', 'reason'], 'Link retract payload');
      requireCondition(validId(e.payload.linkId) && ['correction', 'reassessment', 'withdrawn'].includes(e.payload.reason), 'Bad link retract');
    }
  }
  return true;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function fingerprint(value) { return createHash('sha256').update(stable(value)).digest('hex'); }

/** Reconstruct knowledge and life *as known by the system at that time*.
 *  asOf is the actual observation time (UTC), NOT a backdated historical event.
 */
export function replay(events, {asOf = null} = {}) {
  if (asOf !== null) requireCondition(isInstant(asOf), 'asOf must be UTC ISO instant');
  requireCondition(Array.isArray(events), 'events must be an array');
  const byId = new Map(), bySeq = new Map();
  for (const ev of events) {
    validateEvent(ev);
    const existingId = byId.get(ev.eventId);
    if (existingId) {
      requireCondition(stable(existingId) === stable(ev), `Conflicting duplicate eventId: ${ev.eventId}`);
      continue; // exact, idempotent duplicate
    }
    requireCondition(!bySeq.has(ev.seq), `Conflicting sequence: ${ev.seq}`);
    byId.set(ev.eventId, ev);
    bySeq.set(ev.seq, ev);
  }
  const ordered = [...bySeq.values()].sort((a,b) => a.seq - b.seq);
  let lastTime = -Infinity;
  for (const ev of ordered) {
    const currentTime = Date.parse(ev.recordedAt);
    requireCondition(currentTime >= lastTime, `Recorded timestamps not monotonic at seq ${ev.seq}`);
    lastTime = currentTime;
  }
  const records = new Map(), links = new Map(), life = [];
  for (const ev of ordered) {
    if (asOf !== null && Date.parse(ev.recordedAt) > Date.parse(asOf)) break;
    const p = ev.payload;
    switch (ev.kind) {
      case 'archive.record.upsert': records.set(p.record.id, structuredClone(p.record)); break;
      case 'archive.record.remove':
        requireCondition(records.has(p.recordId), `Remove missing record ${p.recordId}`);
        records.delete(p.recordId);
        for (const [key,l] of links) if (l.from === p.recordId || l.to === p.recordId) links.delete(key);
        break;
      case 'archive.link.assert':
        requireCondition(records.has(p.link.from) && records.has(p.link.to), `Link points to unavailable record: ${p.link.id}`);
        links.set(p.link.id, structuredClone(p.link));
        break;
      case 'archive.link.retract':
        requireCondition(links.has(p.linkId), `Retract missing link ${p.linkId}`);
        links.delete(p.linkId); break;
      default:
        for (const id of p.recordRefs) requireCondition(records.has(id), `Life event references unavailable record ${id}`);
        for (const id of (p.linkRefs || [])) requireCondition(links.has(id), `Life event references unavailable link ${id}`);
        // We retain the historical occurrence or reinterpretation dates as
        // metadata, but the lived biological trigger is recordedAt.
        life.push(structuredClone(ev));
    }
  }
  const recordList = [...records.values()].sort((a,b) => a.id.localeCompare(b.id));
  const linkList = [...links.values()].sort((a,b) => a.id.localeCompare(b.id));
  const state = {schema: 'murmurgrove.projection.v1', asOf, records:recordList, links:linkList, lifeEvents:life};
  return {...state, hash:fingerprint(state)};
}

/** Investigation only: not a purge. A real purge must rewrite/dispose source,
 * git history, releases, backups and caches as policy permits, then re-audit.
 */
export function planEthicalPurge(events, recordId) {
  requireCondition(validId(recordId), 'Invalid purge record id');
  const directEventIds = [];
  const affectedLinks = new Set();
  for (const e of events) {
    if (e.kind === 'archive.link.assert' && (e.payload.link.from === recordId || e.payload.link.to === recordId)) affectedLinks.add(e.payload.link.id);
  }
  for (const e of events) {
    const p = e.payload;
    if ((e.kind === 'archive.record.upsert' && p.record.id === recordId) ||
        (e.kind === 'archive.record.remove' && p.recordId === recordId) ||
        (e.kind === 'archive.link.assert' && affectedLinks.has(p.link.id)) ||
        (e.kind === 'archive.link.retract' && affectedLinks.has(p.linkId)) ||
        (LIFE_KINDS.has(e.kind) && (p.recordRefs.includes(recordId) || (p.linkRefs || []).some(id => affectedLinks.has(id))))) directEventIds.push(e.eventId);
  }
  return {recordId, affectedEventIds:directEventIds, affectedLinkIds:[...affectedLinks].sort(),
    requiresManualContentAudit:true, requiresHistoryRewrite:true, requiresBackupAndDeploymentCleanup:true,
    status:'PLAN_ONLY_NOT_PURGED'};
}
