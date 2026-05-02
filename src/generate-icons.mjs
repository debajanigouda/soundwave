import sharp from "sharp";
import { writeFileSync } from "fs";

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#6c63ff"/>
  <text x="256" y="360" font-family="Arial" font-size="300" 
    text-anchor="middle" fill="white">♪</text>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).resize(192, 192).png().toFile("public/icon-192.png");
console.log("✅ icon-192.png created!");

await sharp(buf).resize(512, 512).png().toFile("public/icon-512.png");
console.log("✅ icon-512.png created!");