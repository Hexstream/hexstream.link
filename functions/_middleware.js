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
            throw new Error(`Unexpected type "${type}".`);
        }
    }
    else
        return context.next();
}

function analyzePathname (pathname) {
    return pathname.endsWith(".txt") ? [pathname.slice(0, -4), "t"] : [pathname, "r"];
}

function beautifyEncodedURIComponent (component) {
    return component.replaceAll("%3A", ":").replaceAll("%2F", "/");
}

function constructValidationURL (type, targetURL) {
    function constructURL (baseURL, parameterName) {
        const params = new URLSearchParams({
            [parameterName]: new URL(targetURL)
        });
        const query = beautifyEncodedURIComponent(params.toString());
        return `${baseURL}?${query}`;
    }
    switch (type) {
    case "html":
        return constructURL("https://validator.w3.org/nu/", "doc");
    case "css":
        return constructURL("https://jigsaw.w3.org/css-validator/validator", "uri");
    default:
        throw new Error(`Unexpected type "${type}".`);
    }
}

async function pathToDestination (path, context) {
    if (path === "/validate") {
        const params = new URL(context.request.url).searchParams;
        const type = params.get("type");
        const url = params.get("url");
        return constructValidationURL(type, url);
    }
    else
        return context.env.REDIRECTS.get(path);
}

export async function onRequestGet(context) {
    const request = context.request;
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached)
        return cached;
    const [path, type] = analyzePathname(new URL(request.url).pathname);
    const destination = await pathToDestination(path, context);
    const response = await handleDestination(type, destination, context);
    context.waitUntil(cache.put(request, response.clone()));
    return response;
}
