import { useState, useEffect } from 'react';
import { ImageWithSignedUrl } from './ImageWithSignedUrl';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  placeholder = "/placeholder.svg",
  onLoad,
  onError,
  onClick
}: OptimizedImageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      // Direct URL (for previews or external images)
      setImageSrc(src);
      setLoading(false);
    } else {
      // Supabase storage path - use ImageWithSignedUrl
      setImageSrc(src);
      setLoading(false);
    }
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (error) {
    return (
      <div 
        className={`${className} bg-muted flex items-center justify-center text-muted-foreground`}
        onClick={onClick}
      >
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className={`${className} bg-muted animate-pulse flex items-center justify-center`}
        onClick={onClick}
      >
        <div className="w-8 h-8 bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  // Use ImageWithSignedUrl for Supabase storage paths
  if (imageSrc && !imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:') && !imageSrc.startsWith('http')) {
    return (
      <ImageWithSignedUrl 
        bucket="device-images"
        path={imageSrc}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
      />
    );
  }

  // Regular img for direct URLs
  return (
    <img
      src={imageSrc || placeholder}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      onClick={onClick}
      loading="lazy"
      decoding="async"
    />
  );
};