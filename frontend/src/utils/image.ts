export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  // DRF usually returns /media/path
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://mario-api.ntoric.com/api";
  const baseUrl = apiUrl.split("/api")[0];

  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};
