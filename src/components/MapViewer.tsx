import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types";
import style from "./styles/MapViewer.scss";
import script from "./scripts/MapViewer.inline.js";  // ← .js not .ts

interface MapViewerOptions {
  defaultZoom?: number;
  defaultHeight?: string;
  tileUrl?: string;
}

export default ((opts?: MapViewerOptions) => {
  const defaultZoom = opts?.defaultZoom ?? 13;
  const defaultHeight = opts?.defaultHeight ?? "400px";
  const tileUrl = opts?.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const MapViewer: QuartzComponent = () => {
    return (
      <div
        class="leaflet-map-container"
        data-zoom={defaultZoom}
        data-height={defaultHeight}
        data-tile-url={tileUrl}
        style={`height: ${defaultHeight}`}
      />
    );
  };

  MapViewer.css = style;
  MapViewer.afterDOMLoaded = script;

  return MapViewer;
}) satisfies QuartzComponentConstructor;