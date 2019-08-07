const path = require('path');
const fs = require('fs');

const pwd = (file, query=null) => {
  let files = file.split(/(?=\/)/g);
  let crumbs = '';
  files = files.filter((file) => file !== '/').map((file) => ({
    url: encodeURI(crumbs += file),
    name: file.replace('/', ''),
  }));
  if (query) {
    files = [...files, {
      url: `?${query}`,
      name: decodeURI(query),
    }];
  }
  return files.map((file) => `<a href="${file.url}">${file.name}</a>`).join('<span> > </span>');
};

const ls = (root, callback) => {
  const formattedRoot = root.replace(/^\.\/pages[/]?/, '/');
  let str = '<div>';
  fs.readdir(root, (err, list) => {
    if (err) return callback(err);

    let i = 0;
    (function next() {
      const file = list[i++];
      if (!file) return callback(null, `${str}</div>`);

      const child = `${root}/${file}`;
      fs.stat(child, (err, stat) => {
        if (err) return callback(err);

        if (stat.isDirectory()) {
          str += `<p><a href="${path.resolve(formattedRoot, file)}">${file}</a></p>`;
          next();
        } else {
          const ext = path.extname(file);
          if (ext === '.md') {
            str += `<p><a href="${formattedRoot}?${file.replace(/\.md$/, '')}">${file.replace(/\.md$/, '')}</a></p>`;
          }
          next();
        }
      });
    }());
  });
};

const send = (status, res, content, type='text/html') => {
  res.writeHead(status, { 'Content-Type': type });
  res.end(content);
};

const renderPage = (res, file, query) => {
  fs.readFile('./index.html', 'utf8', (err, html) => {
    if (err) throw err;

    ls('./pages', (err, tree) => {
      if (err) throw err;

      const mount = (status, content) => {
        send(status, res, html.replace('_content_', content));
      };

      html = html.replace('_tree_', tree);
      if (query) {
        fs.readFile(path.resolve(`./pages${file}`, `${query}.md`), 'utf8', (err, markdown) => {
          if (err) {
            mount(404, `<h1>404</h1><p>${err}</p>`);
          } else {
            mount(200, `<p>${pwd(file, query)}</p>${require('marked')(markdown)}`);
          }
        })
      } else {
        ls(`./pages${file}`, (err, tree) => {
          if (err) {
            mount(404, `<h1>404</h1><p>${err}</p>`);
          } else {
            mount(200, `<p>${pwd(file)}</p><h1>${file.split('/').pop()}</h1>${tree}`);
          }
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
    err ? send(404, res, err) : send(200, res, content, type);
  });
};

require('http').createServer((req, res) => {
  let { pathname, query } = require('url').parse(req.url);
  pathname = decodeURI(pathname);
  query = query ? decodeURI(query) : null;
  const ext = path.extname(pathname);
  if (pathname === '/' && !query) {
    query = 'home';
  }
  ext ? renderOther(res, pathname, ext) : renderPage(res, pathname, query);
}).listen(process.env.PORT || 8125);

console.log(`http://127.0.0.1:${process.env.PORT || 8125}`)
