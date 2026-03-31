import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types";
import style from "./styles/MapViewer.scss";
import script from "./scripts/MapViewer.inline.js";

interface MapViewerOptions {
  defaultZoom?: number;
  defaultHeight?: string;
  tileUrl?: string;
}

export default ((opts?: MapViewerOptions) => {
  const MapViewer: QuartzComponent = () => null;

  MapViewer.css = style;
  MapViewer.afterDOMLoaded = script;

  return MapViewer;
}) satisfies QuartzComponentConstructor;