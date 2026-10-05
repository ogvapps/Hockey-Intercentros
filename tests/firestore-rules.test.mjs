import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const FV = firebase.firestore.FieldValue;
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-hockey',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await db.doc('secrets/global').set({ pin: 'GLOBAL1' });
  await db.doc('secrets/t1').set({ pin: 'T1PIN1' });
  await db.doc('secrets/legacy').set({ pin: 'LEG123' });
  await db.doc('tournaments/t1').set({ title: 'T1' });
  await db.doc('tournaments/t2').set({ title: 'T2' });
  await db.doc('app/settings').set({ title: 'Legacy', adminPin: 'old-public' });
  await db.doc('stats/visits').set({ total: 5, lastUpdate: new Date() });
  await db.doc('admins/someone').set({ email: 'x@y.z' });
});

let passed = 0, failed = 0;
const t = async (name, p) => {
  try { await p; passed++; console.log('  ok  ', name); }
  catch (e) { failed++; console.log('  FAIL', name, '-', e.message?.split('\n')[0]); }
};

const anon = env.authenticatedContext('anonA', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const anonB = env.authenticatedContext('anonB', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const anonG = env.authenticatedContext('anonG', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const pub = env.unauthenticatedContext().firestore();
const superA = env.authenticatedContext('super', { email: 'orestesgvillanueva@gmail.com', email_verified: true }).firestore();
const fakeSuper = env.authenticatedContext('fake', { email: 'orestesgvillanueva@gmail.com', email_verified: false }).firestore();

console.log('Public / anonymous without PIN');
await t('public reads tournament', assertSucceeds(pub.doc('tournaments/t1').get()));
await t('public reads legacy settings', assertSucceeds(pub.doc('app/settings').get()));
await t('public cannot read a PIN', assertFails(pub.doc('secrets/t1').get()));
await t('anon cannot read a PIN', assertFails(anon.doc('secrets/t1').get()));
await t('anon without PIN cannot write a match', assertFails(anon.doc('tournaments/t1/matches/m1').set({ score1: 1 })));
await t('anon without PIN cannot delete a tournament', assertFails(anon.doc('tournaments/t1').delete()));
await t('anon without PIN cannot write legacy match', assertFails(anon.doc('matches/m1').set({ score1: 1 })));
await t('unverified super-admin email is not admin', assertFails(fakeSuper.doc('tournaments/t1/matches/m1').set({ score1: 1 })));
await t('anon cannot list admins', assertFails(anon.doc('admins/someone').get()));

console.log('Tournament PIN session');
await t('wrong PIN is rejected', assertFails(anon.doc('adminSessions/anonA/scopes/t1').set({ pin: 'nope', createdAt: FV.serverTimestamp() })));
await t('cannot open a session for another uid', assertFails(anon.doc('adminSessions/anonB/scopes/t1').set({ pin: 'T1PIN1' })));
await t('right PIN opens a session', assertSucceeds(anon.doc('adminSessions/anonA/scopes/t1').set({ pin: 'T1PIN1', createdAt: FV.serverTimestamp() })));
await t('session admin writes a match', assertSucceeds(anon.doc('tournaments/t1/matches/m1').set({ score1: 1 })));
await t('session admin updates tournament', assertSucceeds(anon.doc('tournaments/t1').update({ title: 'T1b' })));
await t('session admin reads own PIN', assertSucceeds(anon.doc('secrets/t1').get()));
await t('tournament PIN does not unlock another tournament', assertFails(anon.doc('tournaments/t2/matches/m1').set({ score1: 1 })));
await t('tournament PIN does not unlock legacy', assertFails(anon.doc('matches/m1').set({ score1: 1 })));
await t('tournament admin cannot create tournaments', assertFails(anon.doc('tournaments/t3').set({ title: 'T3' })));
await t('cannot store a PIN in public settings', assertFails(anon.doc('tournaments/t1').update({ adminPin: '123456' })));
await t('cannot set a PIN shorter than 4', assertFails(anon.doc('secrets/t1').set({ pin: '12' })));

console.log('Changing a PIN revokes old sessions');
await t('anonB opens session with current PIN', assertSucceeds(anonB.doc('adminSessions/anonB/scopes/t1').set({ pin: 'T1PIN1' })));
const batch = anon.batch();
batch.set(anon.doc('secrets/t1'), { pin: 'NEWPIN9', updatedAt: FV.serverTimestamp() });
batch.set(anon.doc('adminSessions/anonA/scopes/t1'), { pin: 'NEWPIN9', createdAt: FV.serverTimestamp() });
await t('admin changes PIN + own session in one batch', assertSucceeds(batch.commit()));
await t('changer keeps access', assertSucceeds(anon.doc('tournaments/t1/matches/m2').set({ score1: 2 })));
await t('old session (anonB) loses access', assertFails(anonB.doc('tournaments/t1/matches/m3').set({ score1: 3 })));

console.log('Global PIN');
await t('global PIN opens a session', assertSucceeds(anonG.doc('adminSessions/anonG/scopes/global').set({ pin: 'GLOBAL1' })));
const create = anonG.batch();
create.set(anonG.doc('tournaments/t3'), { title: 'T3' });
create.set(anonG.doc('secrets/t3'), { pin: '654321', updatedAt: FV.serverTimestamp() });
await t('global admin creates tournament + its PIN', assertSucceeds(create.commit()));
await t('global admin writes any tournament', assertSucceeds(anonG.doc('tournaments/t2/matches/m1').set({ score1: 1 })));
await t('global admin writes legacy', assertSucceeds(anonG.doc('matches/m1').set({ score1: 1 })));
await t('global admin cannot add itself to admins', assertFails(anonG.doc('admins/anonG').set({ email: 'x' })));

console.log('Super-admin and migration');
await t('super-admin removes public PIN from settings', assertSucceeds(superA.doc('app/settings').update({ adminPin: FV.delete() })));
await t('super-admin cannot put it back', assertFails(superA.doc('app/settings').update({ adminPin: 'x' })));
await t('super-admin reads visits', assertSucceeds(superA.doc('stats/visits').get()));

console.log('Visits and presence');
await t('anyone adds one visit', assertSucceeds(pub.doc('stats/visits').set({ total: FV.increment(1), lastUpdate: FV.serverTimestamp() }, { merge: true })));
await t('cannot add 100 visits', assertFails(pub.doc('stats/visits').set({ total: FV.increment(100), lastUpdate: FV.serverTimestamp() }, { merge: true })));
await t('cannot overwrite visits', assertFails(pub.doc('stats/visits').set({ total: 0, lastUpdate: FV.serverTimestamp() })));
await t('public cannot read visits', assertFails(pub.doc('stats/visits').get()));
await t('heartbeat with server time', assertSucceeds(pub.doc('presence/abc123').set({ lastSeen: FV.serverTimestamp() })));
await t('heartbeat with extra data rejected', assertFails(pub.doc('presence/abc123').set({ lastSeen: FV.serverTimestamp(), spam: 'x' })));
await t('heartbeat with fake time rejected', assertFails(pub.doc('presence/abc123').set({ lastSeen: new Date(2000, 1, 1) })));

console.log(`\n${passed} passed, ${failed} failed`);
await env.cleanup();
process.exit(failed ? 1 : 0);
