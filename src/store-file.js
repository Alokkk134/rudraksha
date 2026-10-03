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
