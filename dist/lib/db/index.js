"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRule = createRule;
exports.getRules = getRules;
exports.getRuleById = getRuleById;
exports.createLog = createLog;
exports.getLogs = getLogs;
exports.updateRule = updateRule;
exports.deleteRule = deleteRule;
const sqlite_1 = require("./sqlite");
// Turso is optional; import lazily
let turso = null;
try {
    turso = require('./turso');
}
catch { }
function pickDriver() {
    const driver = (process.env.DB_DRIVER || '').toLowerCase();
    if (driver === 'turso' || driver === 'libsql') {
        if (!turso?.tursoDriver)
            throw new Error('Turso driver selected but not available');
        return turso.tursoDriver;
    }
    return sqlite_1.sqliteDriver;
}
let initPromise = null;
async function ensureInit() {
    if (initPromise)
        return initPromise;
    const driver = (process.env.DB_DRIVER || '').toLowerCase();
    if (driver === 'turso' || driver === 'libsql') {
        if (turso?.tursoDriver?.migrate) {
            initPromise = turso.tursoDriver.migrate().catch((e) => {
                // If migration fails due to permissions or existing tables, continue
                console.warn('DB migrate warning:', e?.message || e);
            }).then(() => { });
        }
        else {
            initPromise = Promise.resolve();
        }
    }
    else {
        initPromise = Promise.resolve();
    }
    return initPromise;
}
async function createRule(rule) { await ensureInit(); return pickDriver().createRule(rule); }
async function getRules(ownerAddress) { await ensureInit(); return pickDriver().getRules(ownerAddress); }
async function getRuleById(id) { await ensureInit(); return pickDriver().getRuleById(id); }
async function createLog(log) { await ensureInit(); return pickDriver().createLog(log); }
async function getLogs(ownerAddress) { await ensureInit(); return pickDriver().getLogs(ownerAddress); }
async function updateRule(id, changes) { await ensureInit(); return pickDriver().updateRule(id, changes); }
async function deleteRule(id, ownerAddress) { await ensureInit(); return pickDriver().deleteRule(id, ownerAddress); }
