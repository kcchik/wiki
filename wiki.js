const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const marked = require('marked');

const cleanDirectories = (dir) => {
  if (!fs.statSync(dir).isDirectory()) return;
  let files = fs.readdirSync(dir);

  if (files.length > 0) {
    for (let file of files) {
      cleanDirectories(path.join(dir, file));
    }
    files = fs.readdirSync(dir);
  }

  if (files.length === 0) {
    fs.rmdirSync(dir);
  }
}

const breadCrumbs = (pathname, query=null) => {
  let crumbs = '';
  let files = pathname
    .split(/(?=\/)/g)
    .filter((pathname) => pathname !== '/')
    .map((pathname) => ({
      url: encodeURI(crumbs += pathname),
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

const listHeaders = (content) => {
  const headers = content.match(/(?<=id=").+(?=")/g);
  let str = '<h4>Content</h4>';
  if (!headers || headers.length === 1) return '';
  for (let header of headers) {
    str += `<p><a href="#${header}">${header}</a></p>`;
  };
  return str;
};

const listFiles = (dir) => {
  const pathname = dir.replace(/^\.\/pages[/]?/, '/');
  const files = fs.readdirSync(dir);
  let str = '<div>';
  for (let file of files) {
    if (fs.statSync(`${dir}/${file}`).isDirectory()) {
      str += `<p><a href="${path.resolve(pathname, file)}">${file}/</a></p>`;
    } else if (path.extname(file) === '.md') {
      const query = file.replace(/\.md$/, '');
      const link = `<p><a href="${pathname}?${query}">${query}</a></p>`;
      str = query === 'home' ? link + str : str + link;
    }
  }
  return `${str}</div>`;
};

const send = (status, res, content, type='text/html') => {
  res.writeHead(status, { 'Content-Type': type });
  res.write(content);
  res.end();
};

const renderPage = (res, pathname, query) => {
  let html = fs.readFileSync('./index.html', 'utf8');
  let tree = `<h4>Menu</h4>${listFiles('./pages')}`;

  const mount = (status, content) => {
    html = html.replace('_tree_', tree);
    send(status, res, html.replace('_content_', `<div>${content}</div>`));
  };

  if (query) {
    fs.readFile(path.resolve(`./pages${pathname}`, `${query[0]}.md`), 'utf8', (err, markdown) => {
      if (query[1] === 'edit') {
        mount(200, `<form class="edit" action="${pathname}" method="POST">`
          + `<input type="hidden" name="file" value="${query[0]}" />`
          + `<p>${breadCrumbs(pathname, query[0])}</p>`
          + `<div>`
          + `<input class="edit_textfield" type="password" name="password" placeholder="password" />&nbsp;`
          + `<input class="edit_button" type="submit" name="action" value="save" />&nbsp;`
          + `<input class="edit_button" type="submit" name="action" value="delete" />`
          + `</div>`
          + `<textarea class="edit_textarea" name="content">${markdown ? markdown : ''}</textarea>`
          + `</form>`);
      } else if (err) {
        mount(404, `<h1>404</h1><p>${err}</p>`);
      } else {
        tree = `${listHeaders(marked(markdown))}${tree}`;
        mount(200, `<p>${breadCrumbs(pathname, query[0])}</p>${marked(markdown)}`);
      }
    });
  } else {
    let subtree;
    try {
      subtree = listFiles(`./pages${pathname}`);
    } catch (err) {
      mount(404, `<h1>404</h1><p>${err}</p>`);
      return;
    }
    mount(200, `<p>${breadCrumbs(pathname)}</p><h1>${pathname.split('/').pop()}</h1>${subtree}`);
  }
};

const renderOther = (res, file) => {
  try {
    send(200, res, fs.readFileSync(`.${file}`), 'application/octet-stream');
  } catch (err) {
    send(404, res, '');
  }
};

const editPage = (req, res, pathname) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
      const params = url.parse(`?${data}`, true).query;
      const password = process.env.PASS || 'password';
      let redirect;
      let dir;
      if (params.password !== password) {
        redirect = `${pathname}?${params.file}&edit`;
      } else if (params.action === 'delete') {
        dir = path.resolve(`./pages${pathname}`, `${params.file}.md`);
        if (fs.existsSync(dir)) {
          fs.unlinkSync(dir);
          cleanDirectories('./pages');
        }
        redirect = '/?home';
      } else {
        dir = `./pages${pathname}`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.resolve(dir, `${params.file}.md`), params.content);
        redirect = `${pathname}?${params.file}`;
      }
      res.writeHead(301, { Location: redirect });
      res.end();
  });
}

const port = process.env.PORT || 8125;
http.createServer((req, res) => {
  let { pathname, query } = url.parse(req.url);
  pathname = decodeURI(pathname);
  query = query ? decodeURI(query).split('&') : null;
  if (req.method === 'POST') {
    editPage(req, res, pathname);
  } else if (pathname === '/' && !query) {
    res.writeHead(301, { Location: '?home' });
    res.end();
  } else if (path.extname(pathname)) {
    renderOther(res, pathname);
  } else {
    renderPage(res, pathname, query);
  }
}).listen(port);

console.log(`http://127.0.0.1:${port}`);
