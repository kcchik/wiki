const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const marked = require('marked');
const pg = require('pg');

const port = process.env.PORT || 8125;
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

const breadCrumbs = (pathname, query = null) => {
  let crumbs = '';
  let files = pathname
    .split(/(?=\/)/g)
    .filter((pathname) => pathname !== '/')
    .map((pathname) => ({
      url: `${encodeURI(crumbs += pathname)}/`,
      name: pathname.replace('/', ''),
    }));
  if (query) {
    files = [...files, {
      url: `?${query}`,
      name: query,
    }];
  }
  return files.map((file) => `<a href="${file.url}">${file.name}</a>`).join('<span> > </span>');
};

const listFiles = (pathname, callback) => {
  db.query('SELECT name, directory FROM pages WHERE directory LIKE $1', [`${pathname}%`], (err, res) => {
    if (err) {
      callback();
      return;
    }
    const files = res.rows;
    if (files.length === 0) {
      callback();
      return;
    }
    const dirs = [];
    let str = '<div>';
    files.forEach((file) => {
      if (file.directory === pathname) {
        str = `<p><a href="${file.directory}?${file.name}">${file.name}</a></p>${str}`;
      } else if (file.directory.replace(pathname, '').match(/\//g).length === 1 && !dirs.includes(file.directory)) {
        dirs.push(file.directory);
        str = `${str}<p><a href="${file.directory}">${file.directory.slice(1)}</a></p>`;
      }
    });
    callback(`${str}</div>`);
  });
};

const sendAsset = (res, file) => {
  try {
    send(200, res, fs.readFileSync(`.${file}`), 'application/octet-stream');
  } catch (err) {
    send(404, res, '');
  }
};

const sendPageFile = (pathname, query, mount) => {
  db.query('SELECT content FROM pages WHERE name = $1 AND directory = $2', [query[0], pathname], (err, res) => {
    if (err) mount(404);

    const markdown = res.rows.length > 0 ? res.rows[0].content : '';
    if (query[1] === 'edit') {
      const form = fs.readFileSync('./form.html', 'utf8')
        .replace('__pathname__', pathname)
        .replace('__query__', query[0])
        .replace('__breadcrumbs__', breadCrumbs(pathname, query[0]))
        .replace('__markdown__', markdown);
      mount(200, form);
    } else if (res.rows.length > 0) {
      mount(200, `<p>${breadCrumbs(pathname, query[0])}</p>${marked(markdown)}`);
    } else {
      mount(404);
    }
  });
};

const sendPageDirectory = (pathname, mount) => {
  listFiles(pathname, (tree) => {
    if (tree) {
      mount(200, `<p>${breadCrumbs(pathname)}</p><h1>${path.basename(pathname)}</h1>${tree}`);
    } else {
      mount(404);
    }
  });
};

const sendPage = (res, pathname, query = null) => {
  listFiles('/', (tree) => {
    const mount = (status, content = '<h1>404</h1><p>Page not found.</p>') => {
      const html = fs.readFileSync('./index.html', 'utf8')
        .replace('_tree_', `<h4>Menu</h4>${tree}`)
        .replace('_content_', `<div>${content}</div>`);
      send(status, res, html);
    };

    if (query) {
      sendPageFile(pathname, query, mount);
    } else {
      sendPageDirectory(pathname, mount);
    }
  });
};

const editPage = (res, pathname, params) => {
  let redirect;
  let query;
  const queryParams = [params.file, pathname];
  db.query('SELECT COUNT(*) FROM pages WHERE name = $1 AND directory = $2', queryParams, (err, count) => {
    if (!err) {
      if (params.action === 'delete') {
        query = 'DELETE FROM pages WHERE name = $1 AND directory = $2';
        redirect = '/?home';
      } else {
        query = count.rows[0].count > 0 ? 'UPDATE pages SET content = $3 WHERE name = $1 AND directory = $2' : 'INSERT INTO pages VALUES ($1, $2, $3)';
        queryParams.push(params.content);
        redirect = `${pathname}?${params.file}`;
      }
      db.query(query, queryParams, () => {
        res.writeHead(301, { Location: redirect });
        res.end();
      });
    }
  });
};

const sendForm = (req, res, pathname) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    const params = url.parse(`?${data}`, true).query;
    const password = process.env.PASS || 'password';
    if (params.password !== password) {
      res.writeHead(301, { Location: `${pathname}?${params.file}&edit` });
      res.end();
    } else {
      editPage(res, pathname, params);
    }
  });
};

const send = (status, res, content, type = 'text/html') => {
  res.writeHead(status, { 'Content-Type': type });
  res.write(content);
  res.end();
};

db.connect((err) => {
  if (err) throw err;

  http.createServer((req, res) => {
    let { pathname, query } = url.parse(req.url);

    if (path.extname(pathname)) {
      sendAsset(res, pathname);
      return;
    }

    pathname = decodeURI(pathname).replace(/\/?$/, '/');
    if (req.method === 'POST') {
      sendForm(req, res, pathname);
    } else if (query) {
      sendPage(res, pathname, decodeURI(query).split('&'));
    } else if (pathname !== '/') {
      sendPage(res, pathname);
    } else {
      res.writeHead(301, { Location: '?home' });
      res.end();
    }
  }).listen(port);
});
