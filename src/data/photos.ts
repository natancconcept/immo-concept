/* Photos du site : chaque fichier de src/assets/photos est disponible par son nom (sans extension).
   Ex. src/assets/photos/netanya.jpg → "netanya". Astro les convertit en WebP/AVIF aux bonnes tailles. */
import type { ImageMetadata } from "astro";

const files = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*.{jpg,jpeg,png,webp,avif}", { eager: true });

export const PHOTOS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.split("/").pop()!.replace(/\.\w+$/, ""), mod.default]),
);
