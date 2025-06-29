/**
 * A list of countries with their names, dial codes, and ISO 3166-1 alpha-2 codes.
 * This list can be expanded to include all countries.
 */
export const countryCodes = [
  { name: 'United States', dial_code: '+1', code: 'US' },
  { name: 'United Kingdom', dial_code: '+44', code: 'GB' },
  { name: 'Nigeria', dial_code: '+234', code: 'NG' },
  { name: 'India', dial_code: '+91', code: 'IN' },
  { name: 'Canada', dial_code: '+1', code: 'CA' },
  { name: 'Australia', dial_code: '+61', code: 'AU' },
  { name: 'Germany', dial_code: '+49', code: 'DE' },
  { name: 'France', dial_code: '+33', code: 'FR' },
  { name: 'South Africa', dial_code: '+27', code: 'ZA' },
  { name: 'Brazil', dial_code: '+55', code: 'BR' },
  { name: 'Mexico', dial_code: '+52', code: 'MX' },
  { name: 'Japan', dial_code: '+81', code: 'JP' },
  { name: 'China', dial_code: '+86', code: 'CN' },
  { name: 'Russia', dial_code: '+7', code: 'RU' },
  { name: 'Italy', dial_code: '+39', code: 'IT' },
  { name: 'Spain', dial_code: '+34', code: 'ES' },
  { name: 'Netherlands', dial_code: '+31', code: 'NL' },
  { name: 'Sweden', dial_code: '+46', code: 'SE' },
  { name: 'Norway', dial_code: '+47', code: 'NO' },
  { name: 'Denmark', dial_code: '+45', code: 'DK' },
  { name: 'Ghana', dial_code: '+233', code: 'GH' },
  { name: 'Kenya', dial_code: '+254', code: 'KE' },
  { name: 'Uganda', dial_code: '+256', code: 'UG' },
  { name: 'Tanzania', dial_code: '+255', code: 'TZ' },
  { name: 'Zimbabwe', dial_code: '+263', code: 'ZW' },
  { name: 'Philippines', dial_code: '+63', code: 'PH' },
  { name: 'Pakistan', dial_code: '+92', code: 'PK' },
  { name: 'Bangladesh', dial_code: '+880', code: 'BD' },
  { name: 'Argentina', dial_code: '+54', code: 'AR' },
  { name: 'Chile', dial_code: '+56', code: 'CL' },
  { name: 'Colombia', dial_code: '+57', code: 'CO' },
  { name: 'Peru', dial_code: '+51', code: 'PE' },
  // Add more countries here...
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by country name

