/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No workspace dependencies: this app talks to the API over HTTP only, so it
  // deploys and versions independently of the backend.
};
export default nextConfig;
