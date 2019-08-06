const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');
const marked = require('marked');

const walk = (root, done) => {
  let str = '<div>';
  const formattedRoot = root.replace(/^\.\/pages[/]?/, '/');
  fs.readdir(root, (err, list) => {
    if (err) return done(err);

    let i = 0;
    (function next() {
      const file = list[i++];
      if (!file) return done(null, `${str}</div>`);

      const child = `${root}/${file}`;
      fs.stat(child, (err, stat) => {
        if (err) return done(err);

        if (stat.isDirectory()) {
          str += `<a href="${path.resolve(formattedRoot, file)}">${file}/</a>`;
          next();
          // walk(child, (err, res) => {
          //   if (err) return done(err);

          // eslint-disable-next-line max-len
          //   str += `<details><summary>/${file}</summary><div class="folder-content">${res}</div></details>`;
          //   next();
          // });
        } else {
          str += `<a href="${formattedRoot}?${file.replace(/\.[^/.]+$/, '')}">${file.replace(/\.[^/.]+$/, '')}</a>`;
          next();
        }
      });
    }());
  });
};

const renderPage = (res, file, query) => {
  fs.readFile('./index.html', 'utf8', (err, html) => {
    if (err) throw err;

    walk('./pages', (err, tree) => {
      if (err) throw err;

      html = html.replace('_tree_', tree);
      if (query) {
        fs.readFile(path.resolve(`./pages${file}`, `${query}.md`), 'utf8', (err, markdown) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(html.replace('_content_', marked(`# 404\n${err}`)));
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html.replace('_content_', marked(markdown)));
          }
        });
      } else {
        walk(`./pages${file}`, (err, tree) => {
          if (err) throw err;

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html.replace('_content_', `<h1>${file}</h1><a href="${path.dirname(file)}">../</a>${tree}`));
        });
      }
    });
  });
};

const renderOther = (res, file, ext) => {
  const mime = {
    '.css': 'text/css',
  };
  const type = mime[ext] || 'application/octet-stream';

  fs.readFile(`.${file}`, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(err);
    } else {
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
    }
  });
};

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let { query } = parsedUrl;
  const file = parsedUrl.pathname;
  const ext = String(path.extname(file));
  if (file === '/' && !query) {
    query = 'home';
  }

  if (ext) {
    renderOther(res, file, ext);
  } else {
    renderPage(res, file, query);
  }
}).listen(8125);
