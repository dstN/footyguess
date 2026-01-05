import { createEvent } from "h3";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

export function createTestEvent(opts: {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.method = opts.method;
  req.url = opts.url;
  req.headers = {
    "content-type": "application/json",
    ...(opts.headers ?? {}),
  };

  if (opts.body !== undefined) {
    const payload =
      typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    req.headers["content-length"] = Buffer.byteLength(payload).toString();
    (req as any).body = payload;
    req.push(payload);
  }
  req.push(null);

  const res = new ServerResponse(req);
  return createEvent(req, res);
}
