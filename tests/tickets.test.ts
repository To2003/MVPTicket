import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeTicketCode, signTicketToken, verifyTicketToken } from "@/lib/tickets";

const SECRET = "s".repeat(64);

describe("token firmado del QR", () => {
  it("ida y vuelta", () => {
    const id = randomUUID();
    const token = signTicketToken(id, SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
    expect(verifyTicketToken(token, SECRET)).toBe(id);
  });

  it("rechaza un token firmado con otro secreto", () => {
    const token = signTicketToken(randomUUID(), SECRET);
    expect(verifyTicketToken(token, "otro-secreto-".repeat(4))).toBeNull();
  });

  it("rechaza si se cambia el id (no se puede 'apuntar' a otra entrada)", () => {
    const [, sig] = signTicketToken(randomUUID(), SECRET).split(".");
    const [otherId] = signTicketToken(randomUUID(), SECRET).split(".");
    expect(verifyTicketToken(`${otherId}.${sig}`, SECRET)).toBeNull();
  });

  it("rechaza firmas alteradas, truncadas y basura", () => {
    const token = signTicketToken(randomUUID(), SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyTicketToken(flipped, SECRET)).toBeNull();
    expect(verifyTicketToken(token.slice(0, -2), SECRET)).toBeNull();
    expect(verifyTicketToken(token + "x", SECRET)).toBeNull();
    expect(verifyTicketToken("", SECRET)).toBeNull();
    expect(verifyTicketToken("hola.chau", SECRET)).toBeNull();
    expect(verifyTicketToken(`${token}.${token}`, SECRET)).toBeNull();
    expect(verifyTicketToken("a".repeat(500), SECRET)).toBeNull();
  });

  it("solo hay UNA forma válida de escribir cada token (sin variantes en el último carácter)", () => {
    const token = signTicketToken(randomUUID(), SECRET);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const valid = [...alphabet].filter((ch) => verifyTicketToken(token.slice(0, -1) + ch, SECRET) !== null);
    expect(valid).toEqual([token.slice(-1)]);
  });

  it("tolera espacios alrededor (pegado a mano)", () => {
    const id = randomUUID();
    expect(verifyTicketToken(`  ${signTicketToken(id, SECRET)}\n`, SECRET)).toBe(id);
  });

  it("normaliza el código corto que tipean en la puerta", () => {
    expect(normalizeTicketCode("k7m q9px 3rt")).toBe("K7M-Q9PX-3RT");
    expect(normalizeTicketCode("K7M-Q9PX-3RT")).toBe("K7M-Q9PX-3RT");
    expect(normalizeTicketCode("K7M-Q9PX-3R")).toBeNull();
    expect(normalizeTicketCode("O0I-1LLL-111")).toBeNull();
  });
});

import { createHmac } from "node:crypto";
import { verifyMpSignature } from "@/lib/mercadopago";

describe("firma de webhooks de Mercado Pago", () => {
  const secret = "mp-secret";
  const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

  it("acepta una firma válida", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
    expect(
      verifyMpSignature({ secret, signatureHeader: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "123456" }),
    ).toBe(true);
  });

  it("rechaza firma de otro id, sin header o con otro secreto", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
    expect(verifyMpSignature({ secret, signatureHeader: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "999" })).toBe(false);
    expect(verifyMpSignature({ secret, signatureHeader: null, requestId: "req-1", dataId: "123456" })).toBe(false);
    expect(verifyMpSignature({ secret: "otro", signatureHeader: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "123456" })).toBe(false);
    expect(verifyMpSignature({ secret, signatureHeader: "ts=1,v1=zz", requestId: null, dataId: "1" })).toBe(false);
  });
});
