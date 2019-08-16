const db = new require('pg').Client({ connectionString: process.env.DATABASE_URL });
db.connect(() => {
  db.query('CREATE TABLE pages(name text, directory text, content text)', () => {
    db.query(`INSERT INTO pages VALUES ('home', '/', '# Home\nThis wiki is empty!')`);
  });
});