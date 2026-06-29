export type FamilyStatus = 'active' | 'inactive' | 'prospect';
export type ChildGender = 'male' | 'female' | 'other';
export type JewishLineage = 'Bnei Noach' | 'Convert' | 'Maternal' | 'Paternal';

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  birthday: string | null;           // YYYY-MM-DD full date
  birth_year: number | null;         // fallback when full date unknown
  gender: ChildGender | null;
  bar_mitzvah_parsha: string | null; // parsha of their Bar/Bat Mitzvah
  notes: string | null;
  created_at: string;
}

export interface Family {
  id: string;
  family_name: string;
  father_first_name: string | null;
  mother_first_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  program: string | null;
  status: FamilyStatus;
  enrollment_date: string | null;
  jewish_lineage: JewishLineage | null;
  affiliation: string | null;
  notes: string | null;
  facebook_url: string | null;
  labels: string[] | null;
  created_at: string;
  children: Child[];
}

export type FamilyInput = Omit<Family, 'id' | 'created_at' | 'children'> & {
  children?: Omit<Child, 'id' | 'family_id' | 'created_at'>[];
};

export interface DuplicatePair {
  family1: Family;
  family2: Family;
  score: number;    // 0–100
  reasons: string[];
}

export const JEWISH_LINEAGE_OPTIONS: JewishLineage[] = [
  'Bnei Noach',
  'Convert',
  'Maternal',
  'Paternal',
];
