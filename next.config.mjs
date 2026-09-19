/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // packages/core is plain ESM inside the workspace; transpile it rather than
  // adding a build step for a dependency that never leaves this repo.
  transpilePackages: ['@kit/core'],
};
export default nextConfig;
