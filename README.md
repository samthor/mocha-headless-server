**You should use [headless-test](https://github.com/samthor/headless-test) instead of this.**
There's nothing wrong with this package, but it's not as easy to use.

Use to run Mocha tests via headless browsers (currently just Chrome) via a local HTTP server.

Running a local HTTP server enables resources that require network access (e.g., JS module loading).
This will serve files in the current working directory.

# Usage

You should have a boilerplate Mocha test file and a suite of tests.
You'll need [Mocha](http://npmjs.com/package/mocha) and [Chai](http://npmjs.com/package/chai) added to your project.
For a good example of the boilerplate files, check out `ok-emoji`: [harness (HTML)](https://github.com/samthor/ok-emoji/blob/master/test.html), which includes [tests (JS)](https://github.com/samthor/ok-emoji/blob/master/suite.js)

## Binary

From the command-line:

```bash
# either of
yarn global add mocha-headless-server
npm install -g mocha-headless-server

# then
mocha-headless-server path/to/test.html
```

## Node

First, add this project as a dev dependency:

```bash
# either of
npm install --save-dev mocha-headless-server
yarn add --dev mocha-headless-server
```

Then you can `require()` this module and include it in your scripts:

```js
const tester = require('mocha-headless-server');

const options = {
  path: 'path/to/test.html',  // path, required
  log: false,                 // whether to log to console
  headless: true,             // whether to run headless or to show browser
};
const p = tester(options);
p.then((out) => {
  if (out.fail.length) {
    // oh no, a test failed
  }
});
```

## Travis-CI

First, add this project as a dev dependency:

```bash
# either of
npm install --save-dev mocha-headless-server
yarn add --dev mocha-headless-server
```

Then add this script to your `package.json`:

```js
{
  "scripts": {
    "test": "mocha-headless-server path/to/test.html"
  }
}
```

Add this `.travis.yml` file to your project:

```yaml
language: node_js
dist: trusty
node_js:
  - "node"
addons:
  chrome: stable
```

And perform the usual steps to set up [Travis-CI](https://travis-ci.org/) for your project.
