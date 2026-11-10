// Regenerates PNG app icons from the SVG sources. Run: npm run icons
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const icon = await readFile("public/icons/icon.svg");
const maskable = await readFile("public/icons/maskable.svg");
await sharp(icon).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(icon).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(icon).resize(180, 180).flatten({ background: "#2563EB" }).png().toFile("src/app/apple-icon.png");
console.log("Icons generated.");
