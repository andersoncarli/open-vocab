const sqlite3 = require('sqlite3').verbose();
const { DB } = require('./db.js');

class DBSqlite extends DB {
  constructor(path) {
    super(path);
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.path, (err) => {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  createTable(name, schema) {
    const columns = Object.entries(schema).map(([key, type]) => `${key} ${type}`).join(', ');
    const sql = `CREATE TABLE IF NOT EXISTS ${name} (${columns})`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  update(table, id, data) {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(',');
    const values = [...Object.values(data), id];
    const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  find(table, query) {
    const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(query);
    const sql = `SELECT * FROM ${table}${conditions ? ` WHERE ${conditions}` : ''}`;
    return new Promise((resolve, reject) => {
      this.db.all(sql, values, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  findOne(table, query) {
    const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(query);
    const sql = `SELECT * FROM ${table}${conditions ? ` WHERE ${conditions}` : ''} LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(sql, values, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = DBSqlite;