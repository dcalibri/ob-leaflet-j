import { QuartzComponent } from '@quartz-community/types';

interface MapViewerOptions {
    defaultZoom?: number;
    defaultHeight?: string;
    tileUrl?: string;
}
declare const _default: (opts?: MapViewerOptions) => QuartzComponent;

export { _default as MapViewer };
