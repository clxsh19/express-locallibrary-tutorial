require('dotenv').config();
const { Pool } = require('pg');

// const dev_db = {
//   user: 'postgres',
//   host: 'localhost',
//   database: 'library',
//   password: '19122001',
//   port: 5432,
// }

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const query = (text, params, callback) => {
  return pool.query(text, params, callback)
}

module.exports = query;