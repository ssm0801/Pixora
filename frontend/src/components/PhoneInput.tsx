'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States',      dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',             dial: '+1',   flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom',     dial: '+44',  flag: '🇬🇧' },
  { code: 'AU', name: 'Australia',          dial: '+61',  flag: '🇦🇺' },
  { code: 'IN', name: 'India',              dial: '+91',  flag: '🇮🇳' },
  { code: 'CN', name: 'China',              dial: '+86',  flag: '🇨🇳' },
  { code: 'JP', name: 'Japan',              dial: '+81',  flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea',        dial: '+82',  flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore',          dial: '+65',  flag: '🇸🇬' },
  { code: 'AE', name: 'UAE',                dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',       dial: '+966', flag: '🇸🇦' },
  { code: 'DE', name: 'Germany',            dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',             dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',              dial: '+39',  flag: '🇮🇹' },
  { code: 'ES', name: 'Spain',              dial: '+34',  flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands',        dial: '+31',  flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland',        dial: '+41',  flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden',             dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norway',             dial: '+47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark',            dial: '+45',  flag: '🇩🇰' },
  { code: 'FI', name: 'Finland',            dial: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland',             dial: '+48',  flag: '🇵🇱' },
  { code: 'RU', name: 'Russia',             dial: '+7',   flag: '🇷🇺' },
  { code: 'BR', name: 'Brazil',             dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico',             dial: '+52',  flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina',          dial: '+54',  flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia',           dial: '+57',  flag: '🇨🇴' },
  { code: 'CL', name: 'Chile',              dial: '+56',  flag: '🇨🇱' },
  { code: 'ZA', name: 'South Africa',       dial: '+27',  flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria',            dial: '+234', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt',              dial: '+20',  flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya',              dial: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana',              dial: '+233', flag: '🇬🇭' },
  { code: 'PK', name: 'Pakistan',           dial: '+92',  flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh',         dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka',          dial: '+94',  flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal',              dial: '+977', flag: '🇳🇵' },
  { code: 'ID', name: 'Indonesia',          dial: '+62',  flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia',           dial: '+60',  flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines',        dial: '+63',  flag: '🇵🇭' },
  { code: 'TH', name: 'Thailand',           dial: '+66',  flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam',            dial: '+84',  flag: '🇻🇳' },
  { code: 'NZ', name: 'New Zealand',        dial: '+64',  flag: '🇳🇿' },
  { code: 'IL', name: 'Israel',             dial: '+972', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey',             dial: '+90',  flag: '🇹🇷' },
  { code: 'IR', name: 'Iran',               dial: '+98',  flag: '🇮🇷' },
  { code: 'PT', name: 'Portugal',           dial: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece',             dial: '+30',  flag: '🇬🇷' },
  { code: 'HU', name: 'Hungary',            dial: '+36',  flag: '🇭🇺' },
  { code: 'CZ', name: 'Czech Republic',     dial: '+420', flag: '🇨🇿' },
  { code: 'RO', name: 'Romania',            dial: '+40',  flag: '🇷🇴' },
  { code: 'UA', name: 'Ukraine',            dial: '+380', flag: '🇺🇦' },
];

// Sort by name for the dropdown list
const SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

const INDIA = COUNTRIES.find((c) => c.code === 'IN')!;

function parseValue(value: string, defaultCountry: Country): { country: Country; local: string } {
  if (!value) return { country: defaultCountry, local: '' };
  const byLength = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const match = byLength.find((c) => value.startsWith(c.dial));
  if (match) return { country: match, local: value.slice(match.dial.length) };
  return { country: defaultCountry, local: value };
}

interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  defaultCountry?: Country;
}

export default function PhoneInput({
  value,
  onChange,
  disabled,
  placeholder = '000 000 0000',
  className = '',
  defaultCountry = INDIA,
}: PhoneInputProps) {
  const parsed = parseValue(value || '', defaultCountry);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [local, setLocal] = useState(parsed.local);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync from parent when value changes externally (e.g. loaded from API)
  useEffect(() => {
    if (!value) { setCountry(defaultCountry); setLocal(''); return; }
    const { country: c, local: l } = parseValue(value, defaultCountry);
    setCountry(c);
    setLocal(l);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch('');
    onChange(c.dial + local);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^\d\s\-()+]/g, '');
    setLocal(v);
    onChange(country.dial + v);
  };

  const filtered = SORTED.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`flex h-9 rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {/* Country selector */}
      <div ref={dropdownRef} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="h-full flex items-center gap-1 px-2.5 border-r border-input hover:bg-muted/50 transition-colors rounded-l-md text-[13px] font-medium"
        >
          <span>{country.flag}</span>
          <span className="text-muted-foreground">{country.dial}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 px-2 h-8 rounded-md bg-muted/60">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country…"
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            {/* List */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-[12px] text-muted-foreground py-4">No results</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-muted/50 transition-colors ${country.code === c.code ? 'bg-muted/60 font-medium' : ''}`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground text-[12px] shrink-0">{c.dial}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Number input */}
      <input
        type="tel"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="tel-national"
        className="flex-1 min-w-0 h-full px-3 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground rounded-r-md"
      />
    </div>
  );
}
