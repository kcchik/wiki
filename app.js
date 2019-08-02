const http = require('http');
const url = require('url');
const fs = require('fs');
const marked = require('marked');

const walk = (path, done) => {
  const root = {
    path,
    children: [],
  };
  let str = '<div>'
  fs.readdir(path, (err, list) => {
    if (err) return done(err);
    let i = 0;
    (function next() {
      const file = list[i++];
      if (!file) return done(null, `${str}</div>`);
      const childPath = `${path}/${file}`;
      fs.stat(childPath, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(childPath, (err, res) => {
            root.children.push(res);
            str += res;
            next();
          });
        } else {
          root.children.push({ path: file });
          str += `<a>${file}</a>`;
          next();
        };
      });
    })();
  });
};

http.createServer((req, res) => {
  let path = url.parse(req.url).pathname;
  if (path == '/') {
    path = '/home';
  };
  if (path.split('.').pop() == 'css') {
    fs.readFile(`.${path}`, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(err);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(content);
      };
    });
  } else {
    walk('pages', (err, tree) => {
      if (err) throw err;
      fs.readFile('index.html', 'utf8', (err, html) => {
        if (err) throw err;
        html = html.replace('{{tree}}', tree);
        fs.readFile(`pages${path}.md`, 'utf8', (err, markdown) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(html.replace('{{content}}', marked('# 404\nThis page does not exist.')));
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html.replace('{{content}}', marked(markdown)));
          };
        });
      });
    });
  }
}).listen(8125);;
