/**
 * Cloudinary URL helpers — transform stored original URLs into
 * optimized variants for display without re-uploading anything.
 *
 * All functions fall back to the original URL when:
 *  - the URL is not a Cloudinary URL (e.g. local dev mock)
 *  - the mediaType doesn't match the URL path
 */

/**
 * Thumbnail URL for tile / list view (~400×400).
 * - Photos: c_fill crop, auto quality & format (WebP/AVIF in modern browsers)
 * - Videos: first frame (so_0) extracted as a 400×400 JPEG image
 *
 * Loading a tiny JPEG instead of a raw video tag means the grid page is
 * dramatically lighter — especially with 100+ items.
 */
export function thumbnailUrl(url: string, mediaType?: 'photo' | 'video'): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  if (mediaType === 'video') {
    // Replace /video/upload/ path with transformation, then force .jpg extension
    const transformed = url.replace(
      '/video/upload/',
      '/video/upload/c_fill,w_400,h_400,q_auto,f_jpg,so_0/'
    );
    // Strip original extension and append .jpg
    return transformed.replace(/\.[^/.]+$/, '.jpg');
  }

  // Image
  return url.replace('/image/upload/', '/image/upload/c_fill,w_400,h_400,q_auto,f_auto/');
}

/**
 * Preview URL for the full-screen modal (~1920px wide).
 * - Photos: width-capped at 1920, auto quality & format
 * - Videos: return original URL unchanged (played natively by the browser)
 *
 * This is typically 5–20× smaller than the original for high-res cameras
 * while still being indistinguishable at screen size.
 */
export function previewUrl(url: string, mediaType?: 'photo' | 'video'): string {
  if (!url || !url.includes('res.cloudinary.com') || mediaType === 'video') return url;
  return url.replace('/image/upload/', '/image/upload/c_limit,w_1920,q_auto,f_auto/');
}
