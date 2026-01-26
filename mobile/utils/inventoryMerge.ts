
import { InventoryItem } from '../types';
import { convertToBaseUnit, getBaseUnit, formatQuantityWithUnit, getUnitGroupName } from './unitConversion'; // Adjust import if needed, assuming same folder for now or I fix imports later

export interface MergedInventoryItem extends InventoryItem {
    mergedIds: string[];
    mergedCount: number;
    baseQuantity?: number;
    baseUnit?: string;
}

// Merge items with same name, expiry date, AND unit group
export const mergeInventoryItems = (items: InventoryItem[]): MergedInventoryItem[] => {
    const mergeMap = new Map<string, MergedInventoryItem & { baseQuantity: number; baseUnit: string }>();

    items.forEach((item) => {
        // Get the unit group for this item
        const unitGroup = getUnitGroupName(item.unit);

        // Create a key based on name, expiry date, AND unit group
        const key = `${item.name.toLowerCase().trim()}_${item.expiry_date}_${unitGroup}`;

        if (mergeMap.has(key)) {
            // Merge with existing item - convert to base unit and add
            const existing = mergeMap.get(key)!;
            const itemBaseQty = convertToBaseUnit(item.quantity, item.unit);
            existing.baseQuantity += itemBaseQty;
            existing.mergedIds.push(item.id);
            existing.mergedCount += 1;

            // Update display quantity and unit based on total
            const result = formatQuantityWithUnit(existing.baseQuantity, existing.baseUnit);
            existing.quantity = result.quantity;
            existing.unit = result.unit;
        } else {
            // Create new merged item
            const baseQty = convertToBaseUnit(item.quantity, item.unit);
            const baseUnit = getBaseUnit(item.unit);

            mergeMap.set(key, {
                ...item,
                mergedIds: [item.id],
                mergedCount: 1,
                baseQuantity: baseQty,
                baseUnit: baseUnit,
            });
        }
    });

    return Array.from(mergeMap.values()).map(({ baseQuantity, baseUnit, ...item }) => item);
};
