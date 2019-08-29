require('dotenv').config()
const pg = require('pg');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

db.connect((err) => {
  if (err) throw err;
  db.query('CREATE TABLE pages(name text, directory text, content text)', () => {
    db.query(`INSERT INTO pages VALUES ('home', '/', '# Home\nThis wiki is empty!')`);
  });
});