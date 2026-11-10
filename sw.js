/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-f0c192c2'], (function (workbox) { 'use strict';

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "manifest.webmanifest",
    "revision": "51b1d85e1ff669337a34c9ee4b79e6ad"
  }, {
    "url": "index.html",
    "revision": "911918b40de1e0b0af7726263f94c6da"
  }, {
    "url": "icon.svg",
    "revision": "c2a972f16d061c5cf725cf483f960396"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "8b047e9a4e5cfbc8617718ea13759e45"
  }, {
    "url": "icon-512.png",
    "revision": "f33f838143edf4e7addb2a098764f271"
  }, {
    "url": "icon-192.png",
    "revision": "d50a80608f34e87ef56f4d50a0411ca1"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/ReviewScreen-CVdu3gjI.js",
    "revision": null
  }, {
    "url": "assets/pwa-CQu33taF.js",
    "revision": null
  }, {
    "url": "assets/index-CKLwFsS6.css",
    "revision": null
  }, {
    "url": "assets/index-BFaa8awO.js",
    "revision": null
  }, {
    "url": "icon-192.png",
    "revision": "d50a80608f34e87ef56f4d50a0411ca1"
  }, {
    "url": "icon-512.png",
    "revision": "f33f838143edf4e7addb2a098764f271"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "8b047e9a4e5cfbc8617718ea13759e45"
  }, {
    "url": "icon.svg",
    "revision": "c2a972f16d061c5cf725cf483f960396"
  }, {
    "url": "manifest.webmanifest",
    "revision": "51b1d85e1ff669337a34c9ee4b79e6ad"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
