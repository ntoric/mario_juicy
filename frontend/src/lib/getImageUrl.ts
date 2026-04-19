/**
 * Resolves image URLs for both web and mobile platforms.
 * Handles:
 * 1. Relative paths (/media/...) -> Prepends correct public root URL.
 * 2. Absolute paths (http://localhost:8000/media/...) -> "Heals" them by replacing the 
 *    incorrect host/protocol with the correct public production server over HTTPS.
 * 3. Data/Blob URLs -> Returns as is.
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  
  // If it's a data URL (base64) or blob URL, return as is
  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  // Deriving the base URL from the environment variable or fallback
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://mario-api.ntoric.com/api';
  const root = apiBase.split('/api')[0];
  
  // Check if it's an absolute URL (starts with http)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path);
      const host = url.hostname;
      
      // List of hostnames to "heal" (replace with the correct production root)
      const hostsToHeal = ['localhost', '127.0.0.1', 'web', '0.0.0.0'];
      const isPrivateIp = host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');

      if (hostsToHeal.includes(host) || isPrivateIp) {
        // Construct the correct URL using the public root's origin and the original URL's path
        const rootUrl = new URL(root);
        return `${rootUrl.origin}${url.pathname}${url.search}`;
      }
      
      // If it's already an absolute URL but use HTTP, force HTTPS if the root uses it
      if (root.startsWith('https://') && path.startsWith('http://')) {
        return path.replace('http://', 'https://');
      }

      return path;
    } catch (e) {
      console.error("Invalid URL in getImageUrl:", path);
      return path;
    }
  }
  
  // Handle relative paths
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${root}${cleanPath}`;
};
