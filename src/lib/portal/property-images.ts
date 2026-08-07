/**
 * Optional hero / card photos for tenant-portal property browse.
 * Keys are normalized property names (lowercase).
 */
const PROPERTY_IMAGE_BY_NAME: Record<string, string> = {
  "riverbend commerce center": "/properties/riverbend-commerce-center.png",
  riverbend: "/properties/riverbend-commerce-center.png",
  "grandview apartments": "/properties/grandview-apartments.png",
  grandview: "/properties/grandview-apartments.png",
  "meridian tower": "/properties/meridian-tower.png",
  meridian: "/properties/meridian-tower.png",
  "250 west larned": "/welcome/larned-tower.png",
  larned: "/welcome/larned-tower.png",
  "facet & brick plaza": "/welcome/corner-tower.png",
  "facet and brick plaza": "/welcome/corner-tower.png",
};

export function portalPropertyImageUrl(
  propertyName: string | undefined | null
): string | null {
  const key = (propertyName || "").trim().toLowerCase();
  if (!key) return null;
  if (PROPERTY_IMAGE_BY_NAME[key]) return PROPERTY_IMAGE_BY_NAME[key];
  // Soft match: name contains a known key (or vice versa)
  for (const [name, url] of Object.entries(PROPERTY_IMAGE_BY_NAME)) {
    if (key.includes(name) || name.includes(key)) return url;
  }
  return null;
}
