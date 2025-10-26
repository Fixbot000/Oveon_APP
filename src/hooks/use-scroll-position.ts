import { useState, useEffect } from 'react';

export const useScrollPosition = (threshold: number = 20) => {
  const [hasShrunk, setHasShrunk] = useState(false);

  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > threshold && !hasShrunk) {
          setHasShrunk(true);
        } else if (currentScrollY <= threshold && hasShrunk) {
          setHasShrunk(false);
        }
      }, 50); // Debounce for 50ms
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(debounceTimeout);
    };
  }, [threshold, hasShrunk]);

  return { hasShrunk };
};
