// API Response Types

export interface Token {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface DraftItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiration_date: string | null;
  category: string | null;
  location: string | null;
  notes: string | null;
  source: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storage_location: string;
  expiry_date: string;
  created_at: string;
}

export interface InventoryItemCreate {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storage_location: string;
  expiry_date: string;
}

export interface InventoryItemUpdate {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  storage_location?: string;
  expiry_date?: string;
}

export interface DraftItemCreate {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  expiration_date?: string | null;
  category?: string | null;
  location?: string | null;
  notes?: string | null;
  source?: string | null;
  confidence_score?: number | null;
}

// Category options
export const CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy',
  'Meat',
  'Fish',
  'Grains',
  'Snacks',
  'Beverages',
  'Frozen',
  'Condiments',
  'Other',
] as const;

// Unit options
export const UNITS = [
  'Pieces',
  'Grams',
  'Kilograms',
  'Liters',
  'Milliliters',
  'Packages',
] as const;

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

// Barcode lookup response
export interface BarcodeLookupResult {
  barcode: string;
  name: string;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  predicted_expiry: string | null;
  confidence_score: number | null;
  reasoning: string | null;
  found_in_database: boolean;
}

// Recipe Types
export interface IngredientInput {
  name: string;
  quantity?: number;
  unit?: string;
  expiry_date?: string;
}

export type RecipeMode = 'auto' | 'manual';
export type TimePreference = 'quick' | 'normal' | 'any';

export interface RecipeGenerationRequest {
  ingredients: IngredientInput[];
  max_recipes?: number;
  mode?: RecipeMode;
  selected_ingredient_names?: string[];
  time_preference?: TimePreference;
  servings?: number;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  from_inventory: boolean;
  is_expiring_soon: boolean;
  days_until_expiry?: number | null;
}

export interface Recipe {
  title: string;
  description: string;
  cooking_time_minutes: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  tips?: string | null;
  recommendation_reason: string;
}

export interface RecipeGenerationResponse {
  recipes: Recipe[];
  ingredients_used: string[];
  ingredients_missing: string[];
}
