import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bachelor Mess — Meal & Expense Manager",
    short_name: "Bachelor Mess",
    description:
      "ব্যাচেলর মেস মিল ও বাজার খরচের হিসাব — মিল কাউন্ট, খরচ এন্ট্রি আর মাসিক মিল রেট রিপোর্ট।",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfaf6",
    theme_color: "#f97316",
    lang: "bn",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
