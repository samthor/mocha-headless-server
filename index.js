/*
 * Copyright 2018 Sam Thorogood. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

const puppeteer = require('puppeteer');
const childProcess = require('child_process');
const handler = require('serve-handler');
const http = require('http');
const util = require('util');

function formatHost(addr) {
  if (addr.family === 'IPv6') {
    return `[${addr.address}]:${addr.port}`;
  }
  return `${addr.address}:${addr.port}`;
}

function runServer() {
  const options = {
    host: 'localhost',  // needed to force IPv4
    port: 0,            // choose unused high port
  };
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);  // TODO: handler serves cwd by default
    server.listen(options, () => resolve(server));
    server.on('error', reject);
  });
}

/**
 * Serialized and run inside the client/test page.
 */
function wrapMocha() {
  const log = console.log.bind(console);
  console.log = (...args) => {
    if (args.length !== 0) {
      return log(...args);
    } else {
      return log('');  // send blank line if no args
    }
  };

  function runnerDone(runner) {
    // store tests under their categories
    const tests = {'all': []};
    ['pass', 'fail', 'pending'].forEach((type) => {
      const t = [];
      tests[type] = t;
      runner.on(type, (test) => {
        const flat = flatten(test);
        t.push(flat);
        tests['all'].push(flat);
      });
    });

    /**
     * Flatten Mocha's `Test` object into plain JSON.
     */
    function flatten(test) {
      return {
        title: test.title,
        duration: test.duration,
        err: test.err ? Object.assign({}, test.err) : null,
      };
    }

    return new Promise((resolve) => {
      runner.on('end', () => resolve(tests));
    });
  }

  Object.defineProperty(window, 'mocha', {
    get() {
      return undefined;
    },
    set(instance) {
      delete window.mocha;
      window.mocha = instance;

      // trick Mocha into outputing terminal-like output
      instance.constructor.reporters.Base.useColors = true;
      instance.reporter(Mocha.reporters.spec);

      const run = instance.run.bind(instance);
      instance.run = (...args) => {
        const runner = run(...args);

        // steal output and log to common global to report completion
        runnerDone(runner).then((out) => {
          window.__mochaTest = out;
        });

        return runner;
      };

      delete window.mocha;
      window.mocha = instance;
    },
    configurable: true,
  });
}

module.exports = function({path, args=[], headless=true, log=false}) {
  const cleanup = [];

  if (process.env.CI || process.env.TRAVIS) {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  async function runner() {
    const server = await runServer();
    cleanup.push(() => server.close());

    const addr = server.address();
    const url = `http://${formatHost(addr)}/${path}`;

    const options = {headless, args};
    const browser = await puppeteer.launch(options);
    cleanup.push(() => browser.close());

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    if (log) {
      page.on('console', (msg) => {
        // arg.jsonValue returns a Promise for some reason
        const p = msg._args.map((arg) => arg.jsonValue());
        Promise.all(p).then((args) => {
          const out = util.format(...args);
          process.stdout.write(out + '\n');
        });
      });
      page.on('pageerror', (err) => console.error(err));
    }
    page.on('dialog', (dialog) => dialog.dismiss());

    await page.evaluateOnNewDocument(wrapMocha);
    await page.goto(url);

    // wait for and return test result global from page
    const timeout = 60 * 1000;
    await page.waitForFunction(() => window.__mochaTest, {timeout});
    return await page.evaluate(() => window.__mochaTest);
  }

  const p = runner();
  return p.then(async () => {
    while (cleanup.length !== 0) {
      await cleanup.pop()();
    }
    return p;  // return original Promise if we cleaned up properly
  });
};
