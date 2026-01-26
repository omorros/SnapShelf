
// Maps actual unit names to their base units and conversion factors
const UNIT_CONFIG: Record<string, { base: string; factor: number; group: string }> = {
    // Weight units - base is Grams
    'grams': { base: 'Grams', factor: 1, group: 'weight' },
    'kilograms': { base: 'Grams', factor: 1000, group: 'weight' },
    // Volume units - base is Milliliters
    'milliliters': { base: 'Milliliters', factor: 1, group: 'volume' },
    'liters': { base: 'Milliliters', factor: 1000, group: 'volume' },
    // Count units
    'pieces': { base: 'Pieces', factor: 1, group: 'count' },
};

// Unit groups for picker (display names)
export const UNIT_GROUPS: Record<string, string[]> = {
    weight: ['Grams', 'Kilograms'],
    volume: ['Milliliters', 'Liters'],
    count: ['Pieces'],
};

// Normalize unit name for lookup
export const normalizeUnit = (unit: string): string => {
    return unit.toLowerCase().trim();
};

// Get the unit group for a given unit (for unit picker)
export const getUnitGroup = (unit: string): string[] => {
    const normalized = normalizeUnit(unit);
    const config = UNIT_CONFIG[normalized];
    if (config) {
        return UNIT_GROUPS[config.group] || [unit];
    }
    return [unit];
};

// Convert quantity to base unit (Grams for weight, Milliliters for volume)
export const convertToBaseUnit = (quantity: number, unit: string): number => {
    const normalized = normalizeUnit(unit);
    const config = UNIT_CONFIG[normalized];
    if (config) {
        return quantity * config.factor;
    }
    return quantity;
};

// Get base unit name for a given unit
export const getBaseUnit = (unit: string): string => {
    const normalized = normalizeUnit(unit);
    const config = UNIT_CONFIG[normalized];
    return config?.base || unit;
};

// Get the unit group name for a unit (weight, volume, or 'unknown')
export const getUnitGroupName = (unit: string): string => {
    const normalized = normalizeUnit(unit);
    const config = UNIT_CONFIG[normalized];
    return config?.group || 'unknown';
};

// Format quantity with appropriate unit (e.g., 1500 Grams -> 1.5 Kilograms)
export const formatQuantityWithUnit = (baseQuantity: number, baseUnit: string): { quantity: number; unit: string } => {
    const normalized = normalizeUnit(baseUnit);

    // Weight: prefer Kilograms for >= 1000g
    if (normalized === 'grams') {
        if (baseQuantity >= 1000) {
            return {
                quantity: Math.round((baseQuantity / 1000) * 100) / 100,
                unit: 'Kilograms'
            };
        }
        return {
            quantity: Math.round(baseQuantity * 10) / 10,
            unit: 'Grams'
        };
    }

    // Volume: prefer Liters for >= 1000ml
    if (normalized === 'milliliters') {
        if (baseQuantity >= 1000) {
            return {
                quantity: Math.round((baseQuantity / 1000) * 100) / 100,
                unit: 'Liters'
            };
        }
        return {
            quantity: Math.round(baseQuantity * 10) / 10,
            unit: 'Milliliters'
        };
    }

    // Other units: return as-is with proper casing
    const properCase = baseUnit.charAt(0).toUpperCase() + baseUnit.slice(1).toLowerCase();
    return {
        quantity: Math.round(baseQuantity * 100) / 100,
        unit: properCase
    };
};
