import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a private storage object
 * @param bucket - The storage bucket name
 * @param path - The object path in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Promise<string | null> - The signed URL or null if error
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (error) {
    console.error(`Failed to get signed URL for ${bucket}/${path}:`, error);
    return null;
  }
}

/**
 * Get signed URLs for multiple storage objects
 * @param bucket - The storage bucket name
 * @param paths - Array of object paths in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Promise<string[]> - Array of signed URLs (empty strings for failed URLs)
 */
export async function getSignedUrls(bucket: string, paths: string[], expiresIn: number = 3600): Promise<string[]> {
  const results = await Promise.allSettled(
    paths.map(path => getSignedUrl(bucket, path, expiresIn))
  );
  
  return results.map(result => 
    result.status === 'fulfilled' && result.value ? result.value : ''
  ).filter(url => url !== '');
}

/**
 * Extract the storage path from a public URL for use with signed URLs
 * @param publicUrl - The public URL from storage
 * @returns string | null - The extracted path or null if invalid
 */
export function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  
  // Extract path after the bucket name
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
  if (!match) return null;
  
  return match[2]; // Return the path part
}

/**
 * Store object path instead of public URL in database
 * @param bucket - The storage bucket name
 * @param fileName - The file name to use
 * @param userId - The user ID for folder organization
 * @returns string - The storage path
 */
export function createStoragePath(bucket: string, fileName: string, userId: string): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'jpg';
  return `${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
}