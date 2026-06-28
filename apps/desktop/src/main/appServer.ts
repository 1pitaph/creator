import { buildApiApp } from "../../../api/src/server.js";
import { app as electronApp } from "electron";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DesktopAppServer = {
  close: () => Promise<void>;
  url: string;
  webRoot: string;
};

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const defaultSecurityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'"
  ].join("; "),
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

const mainDirname = dirname(fileURLToPath(import.meta.url));

type DesktopFastifyApp = Awaited<ReturnType<typeof buildApiApp>>;

type DesktopReply = {
  header: (name: string, value: string) => DesktopReply;
  send: (payload: unknown) => unknown;
  status: (code: number) => DesktopReply;
  type: (contentType: string) => DesktopReply;
};

type DesktopRequest = {
  raw: {
    url?: string;
  };
};

const getWebRoot = () => {
  if (electronApp.isPackaged) {
    return join(process.resourcesPath, "web");
  }

  return resolve(mainDirname, "../../../web/dist");
};

const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const isInsideRoot = (root: string, path: string) => {
  const relativePath = relative(root, path);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};

const resolveRequestPath = (webRoot: string, requestPath: string) => {
  const normalizedPath = requestPath.replaceAll("\\", "/");
  const pathWithoutLeadingSlash = normalizedPath.startsWith("/")
    ? normalizedPath.slice(1)
    : normalizedPath;
  const candidate = resolve(webRoot, pathWithoutLeadingSlash);

  if (!isInsideRoot(webRoot, candidate)) {
    return null;
  }

  return candidate;
};

const routeLooksLikeApi = (path: string) => path === "/api" || path === "/health" || path.startsWith("/api/");

const sendStaticFile = async (reply: DesktopReply, filePath: string) => {
  const extension = extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] ?? "application/octet-stream";

  return reply.type(contentType).send(createReadStream(filePath));
};

const serveWebAsset = async (
  webRoot: string,
  request: DesktopRequest,
  reply: DesktopReply
) => {
  const indexPath = join(webRoot, "index.html");
  const rawUrl = request.raw.url ?? "/";
  let pathname = "/";

  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://desktop.local").pathname);
  } catch {
    return reply.status(400).send({ error: "Invalid request path" });
  }

  if (routeLooksLikeApi(pathname)) {
    return reply.status(404).send({ error: "Not found" });
  }

  const requestedPath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidate = resolveRequestPath(webRoot, requestedPath);

  if (candidate && (await exists(candidate))) {
    const candidateStat = await stat(candidate);

    if (candidateStat.isFile()) {
      return sendStaticFile(reply, candidate);
    }
  }

  return sendStaticFile(reply, indexPath);
};

const installDesktopWebRoutes = async (server: DesktopFastifyApp, webRoot: string) => {
  if (!(await exists(join(webRoot, "index.html")))) {
    throw new Error(`Web dist was not found at ${webRoot}. Run the web build before starting packaged desktop.`);
  }

  server.addHook("onRequest", async (_request: unknown, reply: DesktopReply) => {
    for (const [header, value] of Object.entries(defaultSecurityHeaders)) {
      reply.header(header, value);
    }
  });

  server.get("/*", async (request: DesktopRequest, reply: DesktopReply) =>
    serveWebAsset(webRoot, request, reply)
  );
};

export const startDesktopAppServer = async (): Promise<DesktopAppServer> => {
  const webRoot = getWebRoot();
  const server = await buildApiApp({
    env: {
      cwd: resolve(mainDirname, "../.."),
      envPath: join(electronApp.getPath("userData"), ".env")
    }
  });

  await installDesktopWebRoutes(server, webRoot);
  await server.listen({ host: "127.0.0.1", port: 0 });

  const address = server.server.address();

  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("Desktop app server did not expose a TCP address.");
  }

  return {
    close: () => server.close(),
    url: `http://127.0.0.1:${address.port}`,
    webRoot
  };
};
