// Local JSON-file backend for running the shop on your own computer.

const fs = require('fs');
const path = require('path');

module.exports = function fileBackend() {
  const dir = path.resolve(process.env.DATA_DIR || './data');
  const file = path.join(dir, 'orders.json');
  fs.mkdirSync(dir, { recursive: true });

  const orders = new Map();
  if (fs.existsSync(file)) {
    for (const o of JSON.parse(fs.readFileSync(file, 'utf8'))) orders.set(o.id, o);
  }

  function persist() {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify([...orders.values()], null, 2));
    fs.renameSync(tmp, file);
  }

  const settingsFile = path.join(dir, 'settings.json');
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};

  const clone = (o) => (o ? structuredClone(o) : null);
  const locks = new Map();

  return {
    kind: 'file',
    async load(id) {
      return clone(orders.get(id));
    },
    async save(order) {
      orders.set(order.id, clone(order));
      persist();
    },
    async list() {
      return [...orders.values()].map(clone);
    },
    async remove(id) {
      orders.delete(id);
      persist();
    },
    async getSettings(keys) {
      return keys.map((k) => (k in settings ? settings[k] : null));
    },
    async setSetting(key, value) {
      settings[key] = value;
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    },
    // One process, so a promise chain per lock name is enough.
    async lock(name, fn) {
      const prev = locks.get(name) || Promise.resolve();
      let release;
      const next = new Promise((r) => (release = r));
      locks.set(name, prev.then(() => next));
      await prev;
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
};
