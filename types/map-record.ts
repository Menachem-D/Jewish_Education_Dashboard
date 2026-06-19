export type LayerType = 'synagogue' | 'day_school' | 'head_shliach' | 'population' | 'family';

export interface MapRecord {
  id: string;
  layer_type: LayerType;
  name: string;
  country: string;
  state_province: string;
  city: string;
  metro_area?: string;
  latitude: number;
  longitude: number;
  affiliation?: string;
  email?: string;
  whatsapp?: string;
  population?: number;
  notes?: string;
  raw?: Record<string, string>;
  family_record_id?: string; // links family pins back to the CRM record
}

export interface LayerFilters {
  synagogue: boolean;
  day_school: boolean;
  head_shliach: boolean;
  population: boolean;
  family: boolean;
}

export interface MapStats {
  total: number;
  visible: number;
  synagogues: number;
  daySchools: number;
  headShluchim: number;
  populationCities: number;
}

export const LAYER_COLORS: Record<string, string> = {
  synagogue: '#3B82F6',
  day_school: '#22C55E',
  head_shliach: '#8B5CF6',
  population: '#F97316',
  family: '#EC4899',
};

export const LAYER_LABELS: Record<LayerType, string> = {
  synagogue: 'Synagogue',
  day_school: 'Day School',
  head_shliach: 'Head Shliach',
  population: 'Population',
  family: 'Families (CRM)',
};
