<p align="center">
<img src="https://www.stamhoofd.be/logo.svg" alt="Stamhoofd" height="50"><br><br>
Supporting clubs and non-profits with great software
</p>

# Folder structure

We recently moved to a monorepo to make it easier for new contributors to make changes without having to work in different repositories and creating multiple pull requests. Now you can bundle all your changes in one pull request.

## Frontend 

For everything frontend related, you can take a look at the [readme in the frontend folder](frontend/README.md). We have two SPA, written with Vue + TypeScript. The frontend is build on a custom (open-source) framework 'vue-app-navigation' that makes handing responsive and app-like views/navigation/animations easy. You'll see that it is easy to learn and understand.

## Backend

[Documentation](backend/app/api/README.md) and code is located in the backend folder. 

## Shared

We have some packages that are shared between the frontend and backend. The most important one is `structures`. This package contains all the data structures (communication in the API, stored in the backend, in an encrytped blob or in localstorage) and how they should be encoded and decoded. The data structures are versioned: when an old client communicates with an updated backend, everything will work as usual. Make sure you keep everything backwards compatible, read the documantation in [@simonbackx/simple-encoding](https://github.com/simonbackx/simple-encoding). If you need to add some new data, you'll probably need to make some changes in this package.

# Contributing

Do you want to contribute? GREAT! :D You can build features that you need for your own club or you can help the project. 

This is what you need to know:

1. Try to keep all communication in English, even when you know everyone is speaking the same language. It makes it easier for others to find answers to some questions later on and to join a conversation. We know the software is currently in Dutch only, but that will change in the future ;) 
2. We recommend you to create an issue before starting to build something (unless it is a bugfix or a small improvement, then you can open up a PR right away). Big features should be discussed first.
3. Look at the issues if you want to help build something, or open an issue if you want to help but don't know where to start
4. Create a pull request, make a draft if you feel some discussion is needed or if you want to show your WIP

We're experimenting with a better way to communicate with the community. We've joined the [Matrix network](https://matrix.org). Join our private, end-to-end encrypted chat at [chat.stamhoofd.dev](https://chat.stamhoofd.dev) and say hi 👋 in the `General` channel.

## Development

To run everything locally, we need to glue all the packages together and build them. We only publish packages to the NPM registry during a release.

1. We use `yarn`. Do not use `npm`. That will break things. Use `yarn policies set-version 1.19.0` to set the version of yarn to the one used in the project (and the server). Replace 1.19.0 with the version in package.json > engines > yarn. We use version version 1.19.0 of yarn because of a bug in workspaces after that version (https://github.com/yarnpkg/yarn/issues/7807).
2. When switching branches, cloning the repo or when pulling changes, run `yarn install && yarn build` first in the project root. We use yarn workspaces to glue all packages together in the monorepo. We don't publish individual packages (not anymore, we used to do that).
3. Use `yarn build` in the project directory to build all shared dependencies inside the project. This will make sure eslint works correctly.
4. Install all needed vscode extensions: vetur & eslint. Please use VSCode because that makes sure all the developer tools are the same (e.g. eslint).
5. Make sure you create `/backend/.env` based on `/backend/.env.template`
6. Run tests before creating a pull request.

### Backend

Use these commands in `/backend`

<dl>
  <dt><code>yarn build</code></dt>
  <dd>Build the backend into the /dist folder, using TypeScript cache if possible.</dd>
  <dt><code>yarn build:full</code></dt>
  <dd>Build the backend into the /dist folder, clearing cache before building</dd>
  <dt><code>yarn start</code></dt>
  <dd>Run the backend server locally. This will use the <code>/backend/.env</code> file for configuration. You can use .env.template to create your own .env file.</dd>
  <dt><code>yarn migrations</code></dt>
  <dd>Run all the migrations. If you don't have the tables in your database, this will also create all the tables. You'll need to create the database yourself (choose your connection details and name in .env)</dd>

  <dt><code>yarn test</code></dt>
  <dd>Run the tests on a separate test database. You'll need to setup .env.test (same as .env, but please modify it first and make sure <code>NODE_ENV=test</code> is in it)</dd>
</dl>

### Local development
A docker-compose file exist which automatically does all the required setup for running the backend locally. You can run this command by installing docker and running
- `docker-compose up`

The docker will do the following things:
- Start a mysql server
- Build all shared dependencies
- Execute all migrations
- Build and run the backend
- Run caddy as a reverse-proxy

You will still need to serve the frontend manually.


### Frontend

You can use the following commands in both `/frontend/app/registration` and `/frontend/app/dashboard` (the current frontend apps)

<dl>
  <dt><code>yarn build</code></dt>
  <dd>Build the whole app into /dist, without optimizations (for development)</dd>

  <dt><code>yarn build:production</code></dt>
  <dd>Build the whole app into /dist, with optimizations</dd>

  <dt><code>yarn serve</code></dt>
  <dd>Serve the frontend locally with HMR (use this for development in combination with <code>yarn start</code> in the backend)</dd>
</dl>

### Shared dependencies

All shared dependencies are located in /shared. These packages are used by the backend and the frontend. If you make changes here, you must rebuild the package with `yarn build`. You can rebuild them all at once by running the same command in the project root.

# Support and information

More info on our website:
<a title="Stamhoofd" role="link" rel="author" href="https://www.stamhoofd.be/">Stamhoofd</a>

# License

Stamhoofd is open-source software, licensed under the GNU Affero General Public License Version 3 (AGPLv3). <a href="https://github.com/stamhoofd/stamhoofd/blob/development/LICENSE">View license.</a>
