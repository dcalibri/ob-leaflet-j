// @ts-nocheck
document.addEventListener("nav", () => {
  document.querySelectorAll(".leaflet-map-container").forEach((container) => {
    const zoom = Number(container.dataset.zoom ?? 13);
    const lat = Number(container.dataset.lat ?? 0);
    const lng = Number(container.dataset.lng ?? 0);
    const tileUrl = container.dataset.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const markers = JSON.parse(container.dataset.markers ?? "[]");

    const map = L.map(container).setView([lat, lng], zoom);

    L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng])
        .addTo(map)
        .bindPopup(`
          <div class="leaflet-popup-inner">
            <strong>${marker.title ?? ""}</strong>
            ${marker.description ? `<p>${marker.description}</p>` : ""}
          </div>
        `);
    });

    window.addCleanup(() => map.remove());
  });
});

export default "";