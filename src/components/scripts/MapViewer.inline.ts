// @ts-nocheck
document.addEventListener("nav", () => {
  const containers = document.querySelectorAll(".leaflet-map-container");

  containers.forEach((container) => {
    const zoom = Number(container.dataset.zoom ?? 13);
    const tileUrl = container.dataset.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const map = L.map(container).setView([0, 0], zoom);

    L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    window.addCleanup(() => map.remove());
  });
});

export default "";  // ← makes it a module so TS stops complaining