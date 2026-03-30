import type { QuartzTransformerPlugin } from "@quartz-community/types";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

interface LeafletConfig {
  id: string;
  height: string;
  width: string;
  lat: number;
  long: number;
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  zoomDelta: number;
  unit: string;
  scale: number;
  darkMode: boolean;
  tileServer?: string;
}

function parseLeafletBlock(code: string): LeafletConfig {
  const config: LeafletConfig = {
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
  };

  const lines = code.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (key === "id") config.id = value;
    else if (key === "height") config.height = value;
    else if (key === "width") config.width = value;
    else if (key === "lat") config.lat = parseFloat(value);
    else if (key === "long") config.long = parseFloat(value);
    else if (key === "minZoom") config.minZoom = parseFloat(value);
    else if (key === "maxZoom") config.maxZoom = parseFloat(value);
    else if (key === "defaultZoom") config.defaultZoom = parseFloat(value);
    else if (key === "zoomDelta") config.zoomDelta = parseFloat(value);
    else if (key === "unit") config.unit = value;
    else if (key === "scale") config.scale = parseFloat(value);
    else if (key === "darkMode") config.darkMode = value.toLowerCase() === "true";
    else if (key === "tileServer") config.tileServer = value;
  }

  return config;
}

function generateLeafletHTML(config: LeafletConfig): string {
  const tileUrl =
    config.tileServer || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const mapId = config.id;

  return `<div id="${mapId}" style="height: ${config.height}; width: ${config.width}; border-radius: 8px; overflow: hidden; margin: 1rem 0;"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script>
  (function() {
    const mapContainer = document.getElementById("${mapId}");
    if (!mapContainer) return;
    
    const map = L.map("${mapId}").setView([${config.lat}, ${config.long}], ${config.defaultZoom});
    
    L.tileLayer("${tileUrl}", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      maxZoom: ${config.maxZoom},
      minZoom: ${config.minZoom},
      zoomDelta: ${config.zoomDelta},
    }).addTo(map);
    
    ${config.darkMode ? `mapContainer.style.filter = "brightness(0.6) invert(1) contrast(1.2)";` : ""}
  })();
</script>`;
}

export const LeafletTransformer: QuartzTransformerPlugin = () => {
  return {
    name: "LeafletTransformer",
    markdownPlugins() {
      return [
        () => (tree: Root) => {
          visit(tree, "code", (node, index, parent) => {
            if (node.lang !== "leaflet") return;

            const config = parseLeafletBlock(node.value);
            const html = generateLeafletHTML(config);

            if (parent && typeof index === "number") {
              parent.children[index] = {
                type: "html",
                value: html,
              };
            }
          });
        },
      ];
    },
  };
};