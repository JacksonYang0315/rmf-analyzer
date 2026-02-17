// Cloudflare Worker: Reverse proxy for GitHub Pages with subpath
// Routes: jacksonyang.dev/z/rmf-analyzer/* -> github pages

const GITHUB_PAGES_URL = "https://jacksonyang0315.github.io/rmf-analyzer";
const SUBPATH = "/z/rmf-analyzer";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Only handle requests under /z/rmf-analyzer
    if (!url.pathname.startsWith(SUBPATH)) {
      return new Response("Not Found", { status: 404 });
    }
    
    // Calculate the path to fetch from GitHub Pages
    // /z/rmf-analyzer/ -> /
    // /z/rmf-analyzer/static/js/app.js -> /static/js/app.js
    const targetPath = url.pathname.slice(SUBPATH.length) || "/";
    const targetUrl = GITHUB_PAGES_URL + targetPath + url.search;
    
    // Clone the request with the new URL
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Fetch from GitHub Pages
    const response = await fetch(modifiedRequest);
    
    // Clone response to modify headers if needed
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    return modifiedResponse;
  },
};