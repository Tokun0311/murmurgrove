import { defineConfig } from 'astro/config';
const site = process.env.SITE_URL?.trim() || 'https://murmurgrove.pages.dev';
export default defineConfig({ output: 'static', site });
