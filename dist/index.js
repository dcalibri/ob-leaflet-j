import { createRequire } from 'module';
import { visit } from 'unist-util-visit';

createRequire(import.meta.url);
function parseScalar(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
function parseLeafletBlock(code) {
  const config = {
    id: "leaflet-map",
    height: "500px",
    width: "100%",
    lat: 50,
    long: 50,
    minZoom: 1,
    maxZoom: 10,
    defaultZoom: 5,
    zoomDelta: 1,
    unit: "meters",
    scale: 1,
    darkMode: false,
    markers: []
  };
  const lines = code.split("\n");
  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === void 0) break;
    const trimmed = currentLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i += 1;
      continue;
    }
    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();
    if (key === "markers") {
      i += 1;
      while (i < lines.length) {
        const markerLine = lines[i];
        if (markerLine === void 0) break;
        const markerTrimmed = markerLine.trim();
        if (!markerTrimmed || markerTrimmed.startsWith("#")) {
          i += 1;
          continue;
        }
        if (!markerLine.startsWith(" ") && !markerTrimmed.startsWith("-")) break;
        if (!markerTrimmed.startsWith("-")) {
          i += 1;
          continue;
        }
        const marker = { lat: config.lat, long: config.long };
        const firstLineContent = markerTrimmed.substring(1).trim();
        if (firstLineContent.includes(":")) {
          const firstColon = firstLineContent.indexOf(":");
          const markerKey = firstLineContent.substring(0, firstColon).trim();
          const markerValue = parseScalar(firstLineContent.substring(firstColon + 1).trim());
          if (markerKey === "lat") marker.lat = parseFloat(markerValue);
          else if (markerKey === "long" || markerKey === "lng") marker.long = parseFloat(markerValue);
          else if (markerKey === "popup") marker.popup = markerValue;
          else if (markerKey === "iconUrl") marker.iconUrl = markerValue;
        }
        i += 1;
        while (i < lines.length) {
          const detailLine = lines[i];
          if (detailLine === void 0) break;
          const detailTrimmed = detailLine.trim();
          if (!detailTrimmed || detailTrimmed.startsWith("#")) {
            i += 1;
            continue;
          }
          if (!detailLine.startsWith(" ")) break;
          if (detailTrimmed.startsWith("-")) break;
          const detailColon = detailTrimmed.indexOf(":");
          if (detailColon === -1) {
            i += 1;
            continue;
          }
          const detailKey = detailTrimmed.substring(0, detailColon).trim();
          const detailValue = parseScalar(detailTrimmed.substring(detailColon + 1).trim());
          if (detailKey === "lat") marker.lat = parseFloat(detailValue);
          else if (detailKey === "long" || detailKey === "lng") marker.long = parseFloat(detailValue);
          else if (detailKey === "popup") marker.popup = detailValue;
          else if (detailKey === "iconUrl") marker.iconUrl = detailValue;
          i += 1;
        }
        config.markers.push(marker);
      }
      continue;
    }
    if (key === "id") config.id = parseScalar(value);
    else if (key === "height") config.height = parseScalar(value);
    else if (key === "width") config.width = parseScalar(value);
    else if (key === "lat") config.lat = parseFloat(value);
    else if (key === "long") config.long = parseFloat(value);
    else if (key === "minZoom") config.minZoom = parseFloat(value);
    else if (key === "maxZoom") config.maxZoom = parseFloat(value);
    else if (key === "defaultZoom") config.defaultZoom = parseFloat(value);
    else if (key === "zoomDelta") config.zoomDelta = parseFloat(value);
    else if (key === "unit") config.unit = value;
    else if (key === "scale") config.scale = parseFloat(value);
    else if (key === "darkMode") config.darkMode = value.toLowerCase() === "true";
    else if (key === "tileServer") config.tileServer = parseScalar(value);
    i += 1;
  }
  return config;
}
function generateLeafletHTML(config) {
  const tileUrl = config.tileServer || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const markersJson = JSON.stringify(config.markers);
  return `<div id="${config.id}" style="height: ${config.height}; width: ${config.width}; border-radius: 8px; overflow: hidden; margin: 1rem 0;"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script>
  (function() {
    const map = L.map("${config.id}").setView([${config.lat}, ${config.long}], ${config.defaultZoom});
    const markers = ${markersJson};
    L.tileLayer("${tileUrl}", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: ${config.maxZoom},
      minZoom: ${config.minZoom}
    }).addTo(map);

    markers.forEach((marker) => {
      let leafletMarker;
      if (marker.iconUrl) {
        const customIcon = L.icon({
          iconUrl: marker.iconUrl,
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        leafletMarker = L.marker([marker.lat, marker.long], { icon: customIcon });
      } else {
        leafletMarker = L.marker([marker.lat, marker.long]);
      }

      leafletMarker.addTo(map);
      if (marker.popup) leafletMarker.bindPopup(marker.popup);
    });

    ${config.darkMode ? `document.getElementById("${config.id}").style.filter = "brightness(0.6) invert(1) contrast(1.2)";` : ""}
  })();
</script>`;
}
var LeafletTransformer = () => {
  return {
    name: "LeafletTransformer",
    markdownPlugins() {
      return [
        () => (tree) => {
          visit(tree, "code", (node, index, parent) => {
            if (node.lang !== "leaflet") return;
            const config = parseLeafletBlock(node.value);
            const html = generateLeafletHTML(config);
            if (parent && typeof index === "number") {
              parent.children[index] = {
                type: "html",
                value: html
              };
            }
          });
        }
      ];
    }
  };
};

export { LeafletTransformer };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map