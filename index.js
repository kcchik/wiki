const http = require('http')
const url = require('url')
const fs = require('fs')
const marked = require('marked')

const createPage = (res, content) => {
  fs.readFile('index.html', 'utf8', (err, data) => {
    if (err) throw err
    res.end(data.replace('{{content}}', marked(content)))
  })
}

http.createServer((req, res) => {
  let parsedUrl = url.parse(req.url)
  if (parsedUrl.pathname == '/') parsedUrl.pathname = '/home'
  let path = `pages${parsedUrl.pathname}.md`
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      createPage(res, '# 404\nThis page does not exist.')
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      createPage(res, data)
    }
  })
}).listen(8125)
