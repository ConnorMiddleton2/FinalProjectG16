/**
 * Portfolio assets announced on the tenant browse page but not yet leasable.
 */
export type ComingSoonProperty = {
  id: string;
  propertyName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  blurb: string;
  image: string;
  availableYear: number;
};

export const COMING_SOON_PROPERTIES: ComingSoonProperty[] = [
  {
    id: "coming-soon-250-west-larned",
    propertyName: "250 West Larned",
    streetAddress: "250 W Larned St",
    city: "Detroit",
    state: "MI",
    zip: "48226",
    propertyType: "office",
    blurb: "Modern glass office on Detroit’s downtown corridor",
    image: "/welcome/larned-tower.png",
    availableYear: 2027,
  },
  {
    id: "coming-soon-facet-brick-plaza",
    propertyName: "Facet & Brick Plaza",
    streetAddress: "Downtown corridor",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    propertyType: "mixed-use",
    blurb: "Glass-and-brick mixed-use at a prime urban corner",
    image: "/welcome/corner-tower.png",
    availableYear: 2027,
  },
];
