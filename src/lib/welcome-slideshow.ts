export type WelcomeSlide = {
  id: string;
  name: string;
  location: string;
  image: string;
  /** Softer object-position for people/lifestyle shots */
  objectPosition?: string;
};

/** Portfolio + welcome assets for the home-page slideshow. */
export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: "meridian",
    name: "Meridian Tower",
    location: "500 Meridian Plaza · Chicago, IL",
    image: "/properties/meridian-tower.png",
  },
  {
    id: "grandview",
    name: "Grandview Apartments",
    location: "900 Grandview Pkwy · Nashville, TN",
    image: "/properties/grandview-apartments.png",
  },
  {
    id: "riverbend",
    name: "Riverbend Commerce Center",
    location: "400 Riverbend Pkwy · Oxford, MS",
    image: "/properties/riverbend-commerce-center.png",
  },
  {
    id: "larned",
    name: "250 West Larned",
    location: "250 W Larned St · Detroit, MI · Joining 2027",
    image: "/welcome/larned-tower.png",
  },
  {
    id: "corner",
    name: "Facet & Brick Plaza",
    location: "Downtown corridor · Chicago, IL · Joining 2027",
    image: "/welcome/corner-tower.png",
  },
  {
    id: "team",
    name: "On-site management",
    location: "Lease reviews across the portfolio",
    image: "/welcome/team-review.png",
    objectPosition: "center 30%",
  },
  {
    id: "handshake",
    name: "Owner partnerships",
    location: "Clear agreements, lasting relationships",
    image: "/welcome/handshake.png",
    objectPosition: "center 25%",
  },
];
