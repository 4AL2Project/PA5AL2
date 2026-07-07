import { Injectable } from '@nestjs/common';

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { score: number };
}

@Injectable()
export class GeocodingService {
  private readonly API = 'https://api-adresse.data.gouv.fr/search/';

  async geocode(
    address: string,
    postalCode = '',
    city = ''
  ): Promise<{ lat: number; lng: number } | null> {
    const q = `${address} ${postalCode} ${city}`.trim();
    if (!q) return null;
    try {
      const res = await fetch(`${this.API}?q=${encodeURIComponent(q)}&limit=1`);
      if (!res.ok) return null;

      const data = (await res.json()) as { features: BanFeature[] };
      const first = data.features[0];
      if (!first) return null;

      const [lng, lat] = first.geometry.coordinates;
      return { lat, lng };
    } catch {
      return null;
    }
  }
}
