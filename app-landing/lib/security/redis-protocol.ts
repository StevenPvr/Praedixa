interface PendingCommand {
  resolve: (value: RespValue) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export type RespValue = string | number | null | RespValue[] | Error;

function findCrlf(buffer: Buffer, start: number): number {
  for (let index = start; index < buffer.length - 1; index += 1) {
    if (buffer[index] === 13 && buffer[index + 1] === 10) {
      return index;
    }
  }

  return -1;
}

function encodeRespArray(args: Array<string | number>): Buffer {
  const parts = [`*${args.length}\r\n`];
  for (const arg of args) {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value, "utf8")}\r\n${value}\r\n`);
  }

  return Buffer.from(parts.join(""), "utf8");
}

function parseSimpleString(buffer: Buffer, offset: number, lineEnd: number) {
  return {
    value: buffer.subarray(offset + 1, lineEnd).toString("utf8"),
    nextOffset: lineEnd + 2,
  };
}

function parseError(buffer: Buffer, offset: number, lineEnd: number) {
  return {
    value: new Error(buffer.subarray(offset + 1, lineEnd).toString("utf8")),
    nextOffset: lineEnd + 2,
  };
}

function parseInteger(buffer: Buffer, offset: number, lineEnd: number) {
  const raw = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return {
      value: new Error(`Invalid Redis integer response: ${raw}`),
      nextOffset: lineEnd + 2,
    };
  }

  return {
    value: parsed,
    nextOffset: lineEnd + 2,
  };
}

function parseBulkString(buffer: Buffer, offset: number, lineEnd: number) {
  const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const length = Number.parseInt(rawLength, 10);
  if (!Number.isFinite(length)) {
    return {
      value: new Error(`Invalid Redis bulk length: ${rawLength}`),
      nextOffset: lineEnd + 2,
    };
  }

  const valueStart = lineEnd + 2;
  if (length === -1) {
    return { value: null, nextOffset: valueStart };
  }

  const valueEnd = valueStart + length;
  if (valueEnd + 2 > buffer.length) {
    return null;
  }

  return {
    value: buffer.subarray(valueStart, valueEnd).toString("utf8"),
    nextOffset: valueEnd + 2,
  };
}

function parseArray(buffer: Buffer, offset: number, lineEnd: number) {
  const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const length = Number.parseInt(rawLength, 10);
  if (!Number.isFinite(length)) {
    return {
      value: new Error(`Invalid Redis array length: ${rawLength}`),
      nextOffset: lineEnd + 2,
    };
  }

  const values: RespValue[] = [];
  let cursor = lineEnd + 2;

  for (let index = 0; index < length; index += 1) {
    const parsed = parseRespValue(buffer, cursor);
    if (!parsed) {
      return null;
    }
    values.push(parsed.value);
    cursor = parsed.nextOffset;
  }

  return {
    value: values,
    nextOffset: cursor,
  };
}

function parseRespValue(
  buffer: Buffer,
  offset: number,
): { value: RespValue; nextOffset: number } | null {
  if (offset >= buffer.length) {
    return null;
  }

  const lineEnd = findCrlf(buffer, offset + 1);
  if (lineEnd === -1) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[offset] ?? 0);
  if (prefix === "+") return parseSimpleString(buffer, offset, lineEnd);
  if (prefix === "-") return parseError(buffer, offset, lineEnd);
  if (prefix === ":") return parseInteger(buffer, offset, lineEnd);
  if (prefix === "$") return parseBulkString(buffer, offset, lineEnd);
  if (prefix === "*") return parseArray(buffer, offset, lineEnd);

  return {
    value: new Error(`Unsupported Redis response prefix: ${prefix}`),
    nextOffset: lineEnd + 2,
  };
}

export function toNumber(value: RespValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toStringValue(value: RespValue): string | null {
  return typeof value === "string" ? value : null;
}

export class RespConnection {
  private buffer = Buffer.alloc(0);
  private pending: PendingCommand[] = [];

  constructor(
    private readonly socket: {
      write: (chunk: Buffer, cb: (error?: Error | null) => void) => void;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      end: () => void;
      destroy: () => void;
    },
  ) {
    this.socket.on("data", this.handleData);
    this.socket.on("error", this.handleError);
    this.socket.on("close", this.handleClose);
  }

  async command(
    args: Array<string | number>,
    timeoutMs: number,
  ): Promise<RespValue> {
    return new Promise<RespValue>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending = this.pending.filter((entry) => {
          return entry.resolve !== resolve && entry.reject !== reject;
        });
        reject(new Error("Redis command timeout"));
      }, timeoutMs);

      this.pending.push({ resolve, reject, timeoutId });
      this.socket.write(encodeRespArray(args), (error?: Error | null) => {
        if (!error) return;

        clearTimeout(timeoutId);
        this.pending = this.pending.filter((entry) => {
          return entry.resolve !== resolve && entry.reject !== reject;
        });
        reject(error);
      });
    });
  }

  close(): void {
    try {
      this.socket.end();
    } catch {
      this.socket.destroy();
    }
  }

  private handleData = (chunk: unknown): void => {
    if (!Buffer.isBuffer(chunk) || chunk.length === 0) {
      return;
    }

    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.flush();
  };

  private handleError = (error: unknown): void => {
    const safeError = error instanceof Error ? error : new Error(String(error));
    this.rejectAll(safeError);
  };

  private handleClose = (): void => {
    if (this.pending.length === 0) {
      return;
    }

    this.rejectAll(new Error("Redis connection closed"));
  };

  private flush(): void {
    while (this.pending.length > 0) {
      const parsed = parseRespValue(this.buffer, 0);
      if (!parsed) {
        return;
      }

      this.buffer = this.buffer.subarray(parsed.nextOffset);
      const next = this.pending.shift();
      if (!next) continue;

      clearTimeout(next.timeoutId);
      if (parsed.value instanceof Error) {
        next.reject(parsed.value);
        continue;
      }

      next.resolve(parsed.value);
    }
  }

  private rejectAll(error: Error): void {
    while (this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) continue;
      clearTimeout(next.timeoutId);
      next.reject(error);
    }
  }
}

export async function openRedisConnection(config: {
  host: string;
  port: number;
  tls: boolean;
  connectTimeoutMs: number;
}): Promise<RespConnection> {
  const netModule = await import("node:net");
  const tlsModule = await import("node:tls");

  return new Promise<RespConnection>((resolve, reject) => {
    const socket = config.tls
      ? tlsModule.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        })
      : netModule.createConnection({
          host: config.host,
          port: config.port,
        });

    socket.setNoDelay?.(true);

    const timeoutId = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis connection timeout"));
    }, config.connectTimeoutMs);

    socket.once("error", (error) => {
      clearTimeout(timeoutId);
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    socket.once("connect", () => {
      clearTimeout(timeoutId);
      resolve(new RespConnection(socket));
    });
  });
}
