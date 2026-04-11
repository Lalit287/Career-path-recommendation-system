import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"

const JWT_SECRET = process.env.JWT_SECRET?.trim() || ""

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required and must be set in environment variables")
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url")
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString()
}

function createSignature(header: string, payload: string): string {
  const data = `${header}.${payload}`
  return createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64url")
}

type TokenPayload = {
  userId: string
  email: string
  isAdmin?: boolean
}

export function createToken(payload: TokenPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadStr = base64UrlEncode(JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }))
  const signature = createSignature(header, payloadStr)
  return `${header}.${payloadStr}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, payload, signature] = token.split(".")
    if (!header || !payload || !signature) {
      return null
    }

    const expectedSignature = createSignature(header, payload)

    const actualBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)
    if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
      return null
    }

    const decoded = JSON.parse(base64UrlDecode(payload))

    if (decoded.exp < Date.now()) {
      return null
    }

    if (typeof decoded.userId !== "string" || typeof decoded.email !== "string") {
      return null
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      isAdmin: Boolean(decoded.isAdmin),
    }
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  })
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get("auth-token")?.value
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim()
  }

  return request.cookies.get("auth-token")?.value || null
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}
