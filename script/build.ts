import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "resend",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Remove any stale Vercel handler files that may survive in Vercel's build
  // cache from previous deployments.
  await rm("api/index.ts", { force: true });
  await rm("api/index.js", { force: true });
  await rm("api/index.cjs", { force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("building Vercel API handler...");
  // Bundle ALL server-side JS deps into api/index.js so the Vercel serverless
  // function is self-contained and does not depend on Vercel finding node_modules
  // at runtime. Only native addons (pg-native) and optional bindings are left
  // external since they are not needed and cannot be bundled anyway.
  await esbuild({
    entryPoints: ["server/vercelHandler.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    // Mark only things that cannot/should not be bundled:
    //  - pg-native: optional native addon, not needed (pure-JS pg works fine)
    //  - @mapbox/node-pre-gyp: native addon helper pulled in by some packages
    //  - mock-aws-s3 / aws-sdk / nock: optional test deps inside some packages
    external: [
      "pg-native",
      "@mapbox/node-pre-gyp",
      "mock-aws-s3",
      "aws-sdk",
      "nock",
    ],
    define: {
      "import.meta.url": '"file:///app/api/index.js"',
    },
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
