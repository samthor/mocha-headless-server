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

/**
 * @fileoverview Boilerplate JS to be included _after_ mocha.js. Confirms that there are no script
 * errors and kicks off Mocha itself.
 */

(function() {
  var pageError = null;

  window.addEventListener('error', function(event) {
    pageError = event.filename + ':' + event.lineno + ' ' + event.message;
  });

  window.addEventListener('load', function() {
    if (pageError) {
      suite('page-script-errors', function() {
        test('no script errors on page', function() {
          throw pageError;
        });
      });
    }
    mocha.run();
  });
})();
