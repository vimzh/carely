// Lets a family choose and verify a care recipient's home location on Google Maps.
"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const mapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&v=weekly&libraries=marker&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps could not load."));
    script.onload = () => resolve();
    document.head.append(script);
  }).catch((error) => {
    mapsPromise = null;
    throw error;
  });

  return mapsPromise;
}

type LocationValue = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const initialValueRef = useRef(value);
  const initialOnChangeRef = useRef(onChange);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [loading, setLoading] = useState(Boolean(mapsApiKey));
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState(mapsApiKey ? "" : "Add a Google Maps browser key to enable location selection.");

  useEffect(() => {
    if (!mapsApiKey || !mapElementRef.current) return;
    let cancelled = false;
    let clickListener: google.maps.MapsEventListener | null = null;

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapElementRef.current) return;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        const initialValue = initialValueRef.current;
        const selected = initialValue.latitude !== null && initialValue.longitude !== null
          ? { lat: initialValue.latitude, lng: initialValue.longitude }
          : { lat: 22.9734, lng: 78.6569 };
        const map = new google.maps.Map(mapElementRef.current, {
          center: selected,
          zoom: initialValue.latitude === null ? 4 : 16,
          mapId: mapsMapId,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const marker = new AdvancedMarkerElement({
          map: initialValue.latitude === null ? null : map,
          position: selected,
          title: "Selected home location",
        });
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new google.maps.Geocoder();
        clickListener = map.addListener("click", async (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const latitude = event.latLng.lat();
          const longitude = event.latLng.lng();
          marker.map = map;
          marker.position = { lat: latitude, lng: longitude };
          setLocating(true);
          setMessage("Finding this address…");
          try {
            const { results } = await geocoderRef.current!.geocode({ location: { lat: latitude, lng: longitude } });
            const nextAddress = results[0]?.formatted_address ?? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            initialOnChangeRef.current({ address: nextAddress, latitude, longitude });
            setMessage(results[0] ? "Home location selected." : "Address not found; the map coordinates will be saved.");
          } catch {
            const nextAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            initialOnChangeRef.current({ address: nextAddress, latitude, longitude });
            setMessage("Address lookup failed; the map coordinates will be saved.");
          } finally {
            setLocating(false);
          }
        });
        setLoading(false);
        setMessage(initialValue.latitude === null ? "Search for an address or select a point on the map." : "Home location selected.");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        setMessage(error instanceof Error ? error.message : "Google Maps could not load.");
      });

    return () => {
      cancelled = true;
      if (clickListener) clickListener.remove();
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  async function findAddress() {
    const query = value.address.trim();
    if (!query || !geocoderRef.current || !mapRef.current || !markerRef.current) return;
    setLocating(true);
    setMessage("Finding this address…");
    try {
      const { results } = await geocoderRef.current.geocode({ address: query });
      const result = results[0];
      if (!result) {
        setMessage("No matching location was found. Try a nearby town or postcode.");
        return;
      }
      const latitude = result.geometry.location.lat();
      const longitude = result.geometry.location.lng();
      mapRef.current.setCenter({ lat: latitude, lng: longitude });
      mapRef.current.setZoom(16);
      markerRef.current.map = mapRef.current;
      markerRef.current.position = { lat: latitude, lng: longitude };
      onChange({ address: result.formatted_address, latitude, longitude });
      setMessage("Home location selected.");
    } catch {
      setMessage("Address lookup failed. Check the address and try again.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">
        Home location <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Google Maps verifies the address. Carely uses it only when they ask for a nearby place or service.
      </p>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Home address"
            value={value.address}
            onChange={(event) => {
              onChange({ address: event.target.value, latitude: null, longitude: null });
              setMessage("Select this address on the map before saving.");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void findAddress();
              }
            }}
            placeholder="Village, town, landmark, or full address"
            className="pl-9"
            disabled={!mapsApiKey}
          />
        </div>
        <Button type="button" variant="outline" onClick={findAddress} disabled={!mapsApiKey || locating || !value.address.trim()}>
          {locating ? <LocateFixed className="animate-pulse" aria-hidden="true" /> : <Search aria-hidden="true" />}
          Find
        </Button>
      </div>
      <div
        ref={mapElementRef}
        className="h-56 overflow-hidden rounded-md border bg-muted sm:h-64"
        role="region"
        aria-label="Select the care recipient's home location on Google Maps"
        aria-busy={loading || locating}
      />
      <p className="min-h-5 text-xs text-muted-foreground" role="status" aria-live="polite">
        {loading ? "Loading Google Maps…" : message}
      </p>
    </fieldset>
  );
}
