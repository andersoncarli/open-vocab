class DB {
  constructor(path) {
    this.path = path;
    if (new.target === DB) {
      throw new TypeError("Cannot construct DB instances directly");
    }
  }
  connect() { throw new Error("Method 'connect()' must be implemented."); }
  createTable(name, schema) { throw new Error("Method 'createTable()' must be implemented."); }
  table(name) { return new Table(this, name); }
}

class Table {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }
  insert(data) { return this.db.insert(this.name, data); }
  update(id, data) { return this.db.update(this.name, id, data); }
  delete(id) { return this.db.delete(this.name, id); }
  find(query) { return this.db.find(this.name, query); }
  findOne(query) { return this.db.findOne(this.name, query); }
}

module.exports = { DB, Table };