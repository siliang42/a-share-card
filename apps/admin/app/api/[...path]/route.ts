type RouteContext = {
  params: Promise<{path: string[]}>;
};

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

async function forward(request: Request, context: RouteContext): Promise<Response> {
  const apiUrl = process.env.GUSHI_API_URL;
  const token = process.env.GUSHI_PAIRING_TOKEN;
  if (!apiUrl || !token) {
    return Response.json(
      {detail: "后台代理尚未配置 GUSHI_API_URL 和 GUSHI_PAIRING_TOKEN"},
      {status: 503},
    );
  }

  const {path} = await context.params;
  const safePath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const search = new URL(request.url).search;
  const target = `${apiUrl.replace(/\/$/, "")}/api/${safePath}${search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", request.headers.get("Accept") ?? "application/json");
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
