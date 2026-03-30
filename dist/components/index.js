import { createRequire } from 'module';

createRequire(import.meta.url);

// src/components/styles/MapViewer.scss
var MapViewer_default = ".leaflet-map-container {\n  width: 100%;\n  border-radius: 8px;\n  overflow: hidden;\n  margin: 1rem 0;\n  z-index: 0;\n  position: relative;\n}";

// src/components/scripts/MapViewer.inline.ts
var MapViewer_inline_default = 'document.addEventListener("nav",()=>{document.querySelectorAll(".leaflet-map-container").forEach(t=>{let o=Number(t.dataset.zoom??13),a=t.dataset.tileUrl??"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",e=L.map(t).setView([0,0],o);L.tileLayer(a,{attribution:"\\xA9 OpenStreetMap contributors"}).addTo(e),window.addCleanup(()=>e.remove())})});\n';
var l;
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, o2, r2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((o2 = i2.constructor) && null != o2.getDerivedStateFromError && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  return l.vnode && l.vnode(l2), l2;
}

// src/components/MapViewer.tsx
var MapViewer_default2 = ((opts) => {
  const defaultZoom = opts?.defaultZoom ?? 13;
  const defaultHeight = opts?.defaultHeight ?? "400px";
  const tileUrl = opts?.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const MapViewer = () => {
    return /* @__PURE__ */ u2(
      "div",
      {
        class: "leaflet-map-container",
        "data-zoom": defaultZoom,
        "data-height": defaultHeight,
        "data-tile-url": tileUrl,
        style: `height: ${defaultHeight}`
      }
    );
  };
  MapViewer.css = MapViewer_default;
  MapViewer.afterDOMLoaded = MapViewer_inline_default;
  return MapViewer;
});

export { MapViewer_default2 as MapViewer };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map