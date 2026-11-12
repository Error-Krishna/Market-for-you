import path from "node:path";

const toRelative = (dir, files) =>
  files.map((file) => `"${path.relative(dir, file)}"`).join(" ");

export default {
  "market-aura-4u-backend-main/{src,tests}/**/*.js": (files) =>
    `npx eslint --fix ${files.map((file) => `"${file}"`).join(" ")}`,
  "market-aura-4u-frontend-main/{src,tests}/**/*.{ts,tsx}": (files) => {
    const rel = toRelative("market-aura-4u-frontend-main", files);
    return [
      `cd market-aura-4u-frontend-main && npx eslint --fix ${rel}`,
      `cd market-aura-4u-frontend-main && npx prettier --write ${rel}`,
    ];
  },
  "market-aura-4u-frontend-main/**/*.{css,md,json}": (files) => {
    const rel = toRelative("market-aura-4u-frontend-main", files);
    return `cd market-aura-4u-frontend-main && npx prettier --write ${rel}`;
  },
};
