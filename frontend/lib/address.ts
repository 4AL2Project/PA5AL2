// Accès à la Base Adresse Nationale (api-adresse.data.gouv.fr), l'API adresse
// de l'État. API publique (CORS) : appelée directement côté client.

const BAN_SEARCH_URL = 'https://api-adresse.data.gouv.fr/search/';

export interface Coords {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  label: string;
  postcode: string;
  city: string;
  coords: Coords | null;
}

interface BanFeature {
  geometry?: { coordinates: [number, number] };
  properties: {
    label: string;
    postcode?: string;
    city?: string;
  };
}

function coordsFromFeature(f: BanFeature): Coords | null {
  const c = f.geometry?.coordinates;
  if (!c) return null;
  const [lng, lat] = c;
  return { lat, lng };
}

/** Recherche des adresses correspondant à `query` (autocomplétion). */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const res = await fetch(
    `${BAN_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=5`,
    { signal }
  );
  const payload = (await res.json().catch(() => null)) as {
    features?: BanFeature[];
  } | null;
  return (payload?.features ?? []).map((f) => ({
    label: f.properties.label,
    postcode: f.properties.postcode ?? '',
    city: f.properties.city ?? '',
    coords: coordsFromFeature(f),
  }));
}

/** Géocode une adresse libre et renvoie ses coordonnées WGS84 (ou null). */
export async function geocodeAddress(query: string): Promise<Coords | null> {
  try {
    const res = await fetch(
      `${BAN_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=1`
    );
    const payload = (await res.json().catch(() => null)) as {
      features?: BanFeature[];
    } | null;
    const first = payload?.features?.[0];
    return first ? coordsFromFeature(first) : null;
  } catch {
    return null;
  }
}
