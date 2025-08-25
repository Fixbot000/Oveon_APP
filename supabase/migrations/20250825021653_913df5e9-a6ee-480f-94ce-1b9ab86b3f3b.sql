-- Add image_urls column to posts table to support multiple images
ALTER TABLE public.posts 
ADD COLUMN image_urls text[];

-- Create index for better performance when querying posts with images
CREATE INDEX idx_posts_image_urls ON public.posts USING GIN(image_urls) WHERE image_urls IS NOT NULL;