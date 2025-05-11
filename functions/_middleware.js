const defaultCachingHeaders = {
    "Cache-Control": "max-age=86400"
};

function handleDestination (type, destination, context) {
    if (destination) {
        switch (type) {
        case "r":
            return new Response(null, {
                status: 301,
                headers: {
                    "Location": destination,
                    ...defaultCachingHeaders
                }
            });
        case "t":
            return new Response(destination, {
                headers: defaultCachingHeaders
            });
        default:
            throw new Error(`Unexpected type "{type}".`);
        }
    }
    else
        return context.next();
}

function analyzePathname (pathname) {
    return pathname.endsWith(".txt") ? [pathname.slice(0, -4), "t"] : [pathname, "r"];
}

export async function onRequestGet(context) {
    const request = context.request;
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached)
        return cached;
    const [path, type] = analyzePathname(new URL(request.url).pathname);
    const destination = await context.env.REDIRECTS.get(path);
    const response = await handleDestination(type, destination, context);
    context.waitUntil(cache.put(request, response.clone()));
    return response;
}
