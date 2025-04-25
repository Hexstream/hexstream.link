async function analyzeRequest (request, redirects) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const txtRequest = pathname.endsWith(".txt");
    const [path, requestType] = txtRequest ? [pathname.slice(0, -4), "t"] : [pathname, "r"];
    const destination = await redirects.get(path);
    return [destination, requestType];
}

function handleRedirectRequest (context, destination) {
    if (destination)
        return Response.redirect(destination, 301);
    else
        return context.next();
}

function handleTxtRequest (context, destination) {
    if (destination)
        return new Response(destination);
    else
        return context.next();
}

export async function onRequestGet(context) {
    const [destination, requestType] = await analyzeRequest(context.request, context.env.REDIRECTS);
    const handler = requestType === "r" ? handleRedirectRequest : handleTxtRequest;
    return handler(context, destination);
}
