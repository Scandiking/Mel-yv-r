export interface TidalResponse {
  tideLocations: TideLocation[];
}

export interface TideLocation {
  name: string;
  coordinate: {
    lon: number;
    lat: number;
  };
  tide: TideEntry[];
}

export interface TideEntry {
  time: string;
  surge: number;
  tide: number;
  total: number;
}

export interface TideExtrema {
  time: string;
  total: number;
  type: 'high' | 'low';
}
