const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const marked = require('marked');

const breadCrumbs = (file, query=null) => {
  let files = file.split(/(?=\/)/g);
  let crumbs = '';
  files = files.filter((file) => file !== '/').map((file) => ({
    url: encodeURI(crumbs += file),
    name: file.replace('/', ''),
  }));
  if (query) {
    files = [...files, {
      url: `?${query}`,
      name: query,
    }];
  }
  return files.map((file) => `<a href="${file.url}">${file.name}</a>`).join('<span> > </span>');
};

const listHeaders = (content) => {
  let str = '<h4>Contents</h4>';
  let headers = content.match(/(?<=id=").+(?=")/g);
  if (!headers || headers.length === 1) return '';
  for (let header of headers) {
    str += `<p><a href="#${header}">${header}</a></p>`;
  };
  return str;
};

const listFiles = (root, callback) => {
  const trimmedRoot = root.replace(/^\.\/pages[/]?/, '/');
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
          str += `<p><a href="${path.resolve(trimmedRoot, file)}">${file}</a></p>`;
          next();
        } else {
          const ext = path.extname(file);
          if (ext === '.md') {
            const trimmedFile = file.replace(/\.md$/, '')
            if (trimmedFile === 'home') {
              str = `<p><a href="${trimmedRoot}?${trimmedFile}">${trimmedFile}</a></p>${str}`;
            } else {
              str += `<p><a href="${trimmedRoot}?${trimmedFile}">${trimmedFile}</a></p>`;
            }
          }
          next();
        }
      });
    }());
  });
};

const send = (status, res, content, type='text/html') => {
  res.writeHead(status, { 'Content-Type': type });
  res.write(content);
  res.end();
};

const renderPage = (res, file, query) => {
  fs.readFile('./index.html', 'utf8', (err, html) => {
    if (err) throw err;

    listFiles('./pages', (err, tree) => {
      if (err) throw err;

      const mount = (status, content) => {
        html = html.replace('_tree_', tree);
        send(status, res, html.replace('_content_', content));
      };

      tree = `<h4>Menu</h4>${tree}`;
      if (query) {
        fs.readFile(path.resolve(`./pages${file}`, `${query[0]}.md`), 'utf8', (err, markdown) => {
          if (err) {
            mount(404, `<h1>404</h1><p>${err}</p>`);
          } else {
            tree = `${listHeaders(marked(markdown))}${tree}`;
            if (query[1] === 'edit') {
              mount(200, `<form class="edit" action="${file}" method="POST">`
                + `<input type="hidden" name="file" value="${query[0]}" />`
                + `<p>${breadCrumbs(file, query[0])}</p>`
                + '<input class="edit_button" type="submit" value="Save" />'
                + `<textarea class="edit_textarea" name="content">${markdown}</textarea>`
                + '</form>');
            } else {
              mount(200, `<p class="breadcrumbs">${breadCrumbs(file, query[0])}</p>${marked(markdown)}`);
            }
          }
        })
      } else {
        listFiles(`./pages${file}`, (err, tree) => {
          if (err) {
            mount(404, `<h1>404</h1><p>${err}</p>`);
          } else {
            mount(200, `<p class="breadcrumbs">${breadCrumbs(file)}</p><h1>${file.split('/').pop()}</h1>${tree}`);
          }
        });
      }
    });
  });
};

const renderOther = (res, file, ext) => {
  fs.readFile(`.${file}`, (err, content) => {
    err ? send(404, res, '') : send(200, res, content, 'application/octet-stream');
  });
};

const writePage = (req, res, file) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
      const params = url.parse(`?${data}`, true).query
      fs.writeFile(path.resolve(`./pages${file}`, `${params.file}.md`), params.content, (err) => {
        if (err) throw err;
        res.writeHead(301, { Location: `${file}?${params.file}` });
        res.end();
      });
  });
}

const port = process.env.PORT || 8125;
http.createServer((req, res) => {
  let { pathname, query } = url.parse(req.url);
  pathname = decodeURI(pathname);
  query = query ? decodeURI(query).split('&') : null;
  const ext = path.extname(pathname);
  if (pathname === '/' && !query) {
    query = ['home'];
  }
  if (req.method === 'POST') {
    writePage(req, res, pathname);
  } else {
    ext ? renderOther(res, pathname, ext) : renderPage(res, pathname, query);
  }
}).listen(port);

console.log(`http://127.0.0.1:${port}`);
