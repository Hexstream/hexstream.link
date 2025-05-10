async function analyzeRequest (request, redirects) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const txtRequest = pathname.endsWith(".txt");
    const [path, requestType] = txtRequest ? [pathname.slice(0, -4), "t"] : [pathname, "r"];
    const destination = await redirects.get(path);
    return [destination, requestType];
}

const defaultCachingHeaders = {
    "Cache-Control": "max-age=86400"
};

function handleRedirectRequest (context, destination) {
    if (destination)
        return new Response(null, {
            status: 301,
            headers: {
                "Location": destination,
                ...defaultCachingHeaders
            }
        });
    else
        return context.next();
}

function handleTxtRequest (context, destination) {
    if (destination)
        return new Response(destination, {
            headers: defaultCachingHeaders
        });
    else
        return context.next();
}

export async function onRequestGet(context) {
    const request = context.request;
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached)
        return cached;
    const [destination, requestType] = await analyzeRequest(request, context.env.REDIRECTS);
    const handler = requestType === "r" ? handleRedirectRequest : handleTxtRequest;
    const response = await handler(context, destination);
    context.waitUntil(cache.put(request, response.clone()));
    return response;
}
