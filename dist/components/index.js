import { createRequire } from 'module';

createRequire(import.meta.url);

// src/components/styles/MapViewer.scss
var MapViewer_default = ".leaflet-map-container {\n  width: 100%;\n  border-radius: 8px;\n  margin: 1rem 0;\n  z-index: 0;\n  position: relative;\n}\n\n.leaflet-popup-inner {\n  font-size: 0.9rem;\n  min-width: 120px;\n}\n.leaflet-popup-inner strong {\n  display: block;\n  margin-bottom: 4px;\n  font-size: 1rem;\n}\n.leaflet-popup-inner p {\n  margin: 0;\n  color: #555;\n}";

// src/components/scripts/MapViewer.inline.ts
var MapViewer_inline_default = 'document.addEventListener("nav",()=>{document.querySelectorAll(".leaflet-map-container").forEach(t=>{let o=Number(t.dataset.zoom??13),s=Number(t.dataset.lat??0),l=Number(t.dataset.lng??0),d=t.dataset.tileUrl??"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",n=JSON.parse(t.dataset.markers??"[]"),a=L.map(t).setView([s,l],o);L.tileLayer(d,{attribution:"\\xA9 OpenStreetMap contributors"}).addTo(a),n.forEach(e=>{L.marker([e.lat,e.lng]).addTo(a).bindPopup(`\n          <div class="leaflet-popup-inner">\n            <strong>${e.title??""}</strong>\n            ${e.description?`<p>${e.description}</p>`:""}\n          </div>\n        `)}),window.addCleanup(()=>a.remove())})});\n';

// src/components/MapViewer.tsx
var MapViewer_default2 = ((opts) => {
  const MapViewer = () => null;
  MapViewer.css = MapViewer_default;
  MapViewer.afterDOMLoaded = MapViewer_inline_default;
  return MapViewer;
});

export { MapViewer_default2 as MapViewer };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map