const MANIFEST_JSON = _readDist("manifest.json");

assertEquals({
  "manifest_version": 3,
  "version": "1.0",
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "js": [
        "content.js"
      ],
      "matches": [
        "<all_urls>"
      ]
    }
  ],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "host_permissions": [
    "<all_urls>"
  ],
  "icons": {
    "16": "icon/16.png",
    "32": "icon/32.png",
    "64": "icon/64.png",
    "128": "icon/128.png"
  },
  "name": "test",
  env: [
    { key: "FOO", value: "bar" }
  ]
}, JSON.parse(MANIFEST_JSON), "Invalid manifest.json");