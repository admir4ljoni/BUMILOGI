// Client-only: loaded by preorder-form via next/dynamic with ssr: false (Leaflet needs window).

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Pin = { lat: number; lng: number; place_id: string | null };

type Hit = { label: string; lat: number; lng: number; place_id: string };

// Photon (komoot): free OSM geocoder that allows search-as-you-type; Nominatim's
// policy forbids autocomplete. Results are limited to Indonesia's bounding box.
// ponytail: public instance, fair use. Self-host Photon or move to a keyed tier if it rate-limits us.
async function search(q: string, signal: AbortSignal): Promise<Hit[]> {
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&bbox=94.9,-11.1,141.1,6.1&lat=-7.5&lon=110.8`,
    { signal },
  );
  const { features } = (await res.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[];
  };
  return features.map(({ geometry: { coordinates: [lng, lat] }, properties: p }) => ({
    label: [...new Set([p.name, [p.street, p.housenumber].filter(Boolean).join(" "), p.district, p.city, p.county, p.state, p.postcode])]
      .filter(Boolean)
      .join(", "),
    lat,
    lng,
    place_id: `${p.osm_type}${p.osm_id}`,
  }));
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Search box + OSM map. Tap the map or drag the pin to fine-tune; the
// free-text address stays the source of truth.
export function AddressMap({ onPick }: { onPick: (pin: Pin, label?: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(null);
  const marker = useRef<L.Marker>(null);
  const pick = useRef(onPick);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    pick.current = onPick;
  });

  useEffect(() => {
    const m = L.map(box.current!).setView([-2.5, 118], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e) => place(e.latlng.lat, e.latlng.lng, null));
    map.current = m;
    return () => {
      m.remove();
      map.current = marker.current = null;
    };
  }, []);

  function place(lat: number, lng: number, place_id: string | null, label?: string) {
    const m = map.current!;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ className: "map-pin", iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        pick.current({ lat: round(p.lat), lng: round(p.lng), place_id: null });
      });
    } else marker.current.setLatLng([lat, lng]);
    if (m.getZoom() < 16) m.setView([lat, lng], 17);
    pick.current({ lat: round(lat), lng: round(lng), place_id }, label);
  }

  useEffect(() => {
    if (q.trim().length < 3) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      search(q.trim(), ctl.signal)
        .then((h) => {
          setHits(h);
          setSearchError(false);
        })
        .catch((e) => e.name !== "AbortError" && setSearchError(true));
    }, 400);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  return (
    <div className="address-map">
      <label className="field">
        <span className="field-label">Cari lokasi</span>
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 3) setHits([]);
          }}
          placeholder="Nama jalan, sekolah, atau kelurahan"
          autoComplete="off"
        />
      </label>
      {searchError && <p className="field-hint">Pencarian tidak tersedia. Ketuk peta untuk menandai lokasi.</p>}
      {hits.length > 0 && (
        <ul className="map-hits">
          {hits.map((h) => (
            <li key={h.place_id}>
              <button
                type="button"
                onClick={() => {
                  place(h.lat, h.lng, h.place_id, h.label);
                  setHits([]);
                }}
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={box} className="map-box" role="application" aria-label="Peta: ketuk untuk menandai lokasi pengiriman" />
      <p className="field-hint">Ketuk peta atau geser pin agar tepat di rumah atau sekolahmu.</p>
    </div>
  );
}
