# Wiki

An attempt at a small, but usable wiki engine.

### Requirements
- Node.js
- PostgreSQL
- Yarn

### Installing
Create a PostgreSQL database
Install dependencies and build
```sh
yarn

DATABASE_URL=<database_url> node build.js
```

### Running
```sh
DATABASE_URL=<database_url> node wiki.js
```

### Why
I created this wiki because I wanted to host something very minimal. Couldn't find anything out there quite as lacking in features as I wanted. Here are some of this wiki's (lack of) features:
- No framework
- No client-side JS
- 2 dependencies (Postgres and markdown)

Behold - My tiny wiki. I should not have made this.
