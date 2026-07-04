export interface ForecastResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  properties: {
    meta: {
      updated_at: string;
      units: Record<string, string>;
    };
    timeseries: ForecastTimestep[];
  };
}

export interface ForecastTimestep {
  time: string;
  data: {
    instant: {
      details: InstantDetails;
    };
    next_1_hours?: PeriodData;
    next_6_hours?: PeriodData;
    next_12_hours?: PeriodData;
  };
}

export interface InstantDetails {
  air_temperature: number;
  wind_speed: number;
  wind_from_direction: number;
  relative_humidity: number;
  air_pressure_at_sea_level: number;
  cloud_area_fraction: number;
  fog_area_fraction?: number;
}

export interface PeriodData {
  summary: {
    symbol_code: string;
  };
  details: {
    precipitation_amount?: number;
    probability_of_precipitation?: number;
    probability_of_thunder?: number;
    air_temperature_max?: number;
    air_temperature_min?: number;
  };
}
