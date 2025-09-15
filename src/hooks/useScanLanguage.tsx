import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SCAN_LANGUAGE_KEY = 'scan-language';

export const useScanLanguage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem(SCAN_LANGUAGE_KEY);
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    localStorage.setItem(SCAN_LANGUAGE_KEY, languageCode);
  };

  // Function to translate user input to English for AI processing
  const translateToEnglish = async (text: string, fromLanguage: string): Promise<string> => {
    if (fromLanguage === 'en' || !text.trim()) {
      return text;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text,
          fromLanguage,
          toLanguage: 'en',
          context: 'user_input'
        }
      });

      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation to English failed:', error);
      // Fallback to original text if translation fails
      return text;
    }
  };

  // Function to translate AI response back to user's language
  const translateFromEnglish = async (text: string, toLanguage: string): Promise<string> => {
    if (toLanguage === 'en' || !text.trim()) {
      return text;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text,
          fromLanguage: 'en',
          toLanguage,
          context: 'ai_response'
        }
      });

      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation from English failed:', error);
      // Fallback to original text if translation fails
      return text;
    }
  };

  return {
    selectedLanguage,
    changeLanguage,
    translateToEnglish,
    translateFromEnglish
  };
};