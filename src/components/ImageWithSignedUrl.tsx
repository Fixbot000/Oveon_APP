import React, { useState, useEffect } from 'react';
import { useImageCache } from '@/store/imageCache';

interface ImageWithSignedUrlProps {
  bucket: string;
  path: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
}

export const ImageWithSignedUrl: React.FC<ImageWithSignedUrlProps> = ({
  bucket,
  path,
  alt,
  className,
  onClick,
  onLoad,
  onError
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { getCachedUrl } = useImageCache();

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!path) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const url = await getCachedUrl(bucket, path);
        if (url) {
          setSignedUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrl();
  }, [bucket, path, getCachedUrl]);

  if (loading) {
    return (
      <div className={`bg-muted animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`bg-muted ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          Failed to load image
        </div>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onLoad={() => {
        setLoading(false);
        onLoad?.();
      }}
      onError={() => {
        setError(true);
        onError?.();
      }}
      loading="lazy"
      decoding="async"
    />
  );
};