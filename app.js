const http = require('http');
const path = require('pathName');
const url = require('url');
const fs = require('fs');
const marked = require('marked');

const walk = (pathName, done) => {
  const root = {
    pathName,
    children: [],
  };
  let str = '<div>'
  fs.readdir(pathName, (err, list) => {
    if (err) return done(err);
    let i = 0;
    (function next() {
      const file = list[i++];
      if (!file) return done(null, `${str}</div>`);
      const childPath = `${pathName}/${file}`;
      fs.stat(childPath, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(childPath, (err, res) => {
            root.children.push(res);
            str += res;
            next();
          });
        } else {
          root.children.push({ pathName: file });
          str += `<a>${file}</a>`;
          next();
        };
      });
    })();
  });
};

http.createServer((req, res) => {
  let pathName = url.parse(req.url).pathname;
  if (pathName == '/') {
    pathName = '/home';
  };
  const ext = String(path.extname(pathName));
  if (!ext) {
    walk('pages', (err, tree) => {
      if (err) throw err;
      fs.readFile('index.html', 'utf8', (err, html) => {
        if (err) throw err;
        html = html.replace('{{tree}}', tree);
        fs.readFile(`pages${pathName}.md`, 'utf8', (err, markdown) => {
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
  } else {
    const mimeTypes = {
      '.css': 'text/css',
    };
    const type = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(`.${pathName}`, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(err);
      } else {
        res.writeHead(200, { 'Content-Type': type });
        res.end(content);
      };
    });
  }
}).listen(8125);;
