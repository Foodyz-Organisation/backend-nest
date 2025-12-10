import { IntensityType } from './intensity-type.enum';

export interface IntensityConfig {
  icon: string; // Icon name/identifier for frontend
  defaultColor: string; // Hex color code
  label: string; // Display name
}

/**
 * Maps intensity types to their default configuration (icon, color, label)
 * Frontend can use this to display appropriate icons and colors
 */
export const INTENSITY_CONFIG_MAP: Record<IntensityType, IntensityConfig> = {
  [IntensityType.COFFEE]: {
    icon: 'coffee',
    defaultColor: '#3E2723', // Dark brown/black
    label: 'Coffee',
  },
  [IntensityType.HARISSA]: {
    icon: 'piment',
    defaultColor: '#D32F2F', // Red
    label: 'Harissa',
  },
  [IntensityType.SAUCE]: {
    icon: 'sauce',
    defaultColor: '#FF6F00', // Orange
    label: 'Sauce',
  },
  [IntensityType.SPICE]: {
    icon: 'spice',
    defaultColor: '#E65100', // Deep orange
    label: 'Spice',
  },
  [IntensityType.SUGAR]: {
    icon: 'sugar',
    defaultColor: '#FFF9C4', // Light yellow
    label: 'Sugar',
  },
  [IntensityType.SALT]: {
    icon: 'salt',
    defaultColor: '#E0E0E0', // Light gray
    label: 'Salt',
  },
  [IntensityType.PEPPER]: {
    icon: 'pepper',
    defaultColor: '#212121', // Black
    label: 'Pepper',
  },
  [IntensityType.CHILI]: {
    icon: 'chili',
    defaultColor: '#C62828', // Dark red
    label: 'Chili',
  },
  [IntensityType.GARLIC]: {
    icon: 'garlic',
    defaultColor: '#FFF9C4', // Light yellow/white
    label: 'Garlic',
  },
  [IntensityType.LEMON]: {
    icon: 'lemon',
    defaultColor: '#FDD835', // Yellow
    label: 'Lemon',
  },
  [IntensityType.CUSTOM]: {
    icon: 'custom',
    defaultColor: '#9E9E9E', // Gray
    label: 'Custom',
  },
};

/**
 * Get intensity configuration for a given type
 */
export function getIntensityConfig(type: IntensityType): IntensityConfig {
  return INTENSITY_CONFIG_MAP[type] || INTENSITY_CONFIG_MAP[IntensityType.CUSTOM];
}

/**
 * Get default color for an intensity type
 */
export function getDefaultIntensityColor(type: IntensityType): string {
  return getIntensityConfig(type).defaultColor;
}

