### Security

- `ui/`: bumped `vite` to 8.3.8 (from 8.1.4), clearing five Dependabot alerts
  (GHSA-587h-7wmj-h5pm high, GHSA-r825-w8mm-5pxw, GHSA-rq7h-c2jc-7f22,
  GHSA-698v-4r3x-3vcv, GHSA-9jrq-w75r-8gcw). The bump also pulled `postcss` to
  8.5.32, which brought the transitive `source-map-js` to 1.2.2, clearing
  GHSA-68fv-2mgg-jv7q (high) and GHSA-fxqj-rqcc-2cmp.
