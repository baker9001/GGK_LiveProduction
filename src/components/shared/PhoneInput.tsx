// /home/project/src/components/shared/PhoneInput.tsx

import React, { useState, useEffect, useRef } from 'react';

// Country codes data - Comprehensive list
export const countryCodes = [
  // Middle East
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+963', country: 'Syria', flag: '🇸🇾' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+967', country: 'Yemen', flag: '🇾🇪' },
  { code: '+970', country: 'Palestine', flag: '🇵🇸' },
  
  // Asia
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+853', country: 'Macau', flag: '🇲🇴' },
  { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
  
  // Europe
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+375', country: 'Belarus', flag: '🇧🇾' },
  
  // Africa
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', country: 'Libya', flag: '🇱🇾' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
  
  // Americas
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+1', country: 'Canada', flag: '🇨🇦' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  
  // Oceania
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  
  // Others
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
].sort((a, b) => a.country.localeCompare(b.country));

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ 
  value = '', 
  onChange, 
  placeholder = 'XXXX XXXX',
  className = '',
  disabled = false,
  required = false
}) => {
  const [countryCode, setCountryCode] = useState('+965');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse the initial value only once
  useEffect(() => {
    if (value && !isInitialized) {
      const match = value.match(/^(\+\d{1,4})\s?(.*)$/);
      if (match) {
        setCountryCode(match[1]);
        setPhoneNumber(match[2] || '');
      } else if (value) {
        setPhoneNumber(value);
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Update parent only when local values change
  useEffect(() => {
    if (isInitialized && onChange) {
      const fullNumber = `${countryCode} ${phoneNumber}`.trim();
      if (fullNumber !== value) {
        onChange(fullNumber);
      }
    }
  }, [countryCode, phoneNumber, isInitialized]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setSearchCountry('');
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  const filteredCountries = countryCodes.filter(c => 
    c.country.toLowerCase().includes(searchCountry.toLowerCase()) ||
    c.code.includes(searchCountry)
  );

  const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

  return (
    <div className={`relative flex ${className}`}>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setShowCountryDropdown(!showCountryDropdown)}
          disabled={disabled}
          className={`flex items-center gap-1 px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{countryCode}</span>
          <svg className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showCountryDropdown && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] max-h-96 overflow-hidden">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={searchCountry}
                onChange={(e) => setSearchCountry(e.target.value)}
                placeholder="Search country or code..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8CC63F]"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={`${country.code}-${country.country}`}
                    type="button"
                    onClick={() => {
                      setCountryCode(country.code);
                      setShowCountryDropdown(false);
                      setSearchCountry('');
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{country.country}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{country.code}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''
        }`}
      />
    </div>
  );
};

export default PhoneInput;