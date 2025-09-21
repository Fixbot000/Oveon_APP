import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
];

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}