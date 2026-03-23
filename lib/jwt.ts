import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "career-path-secret-key-change-in-production"

// Simple JWT-like token implementation
// In production, use a proper library like jose

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url")
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString()
}

function createSignature(header: string, payload: string): string {
  const data = `${header}.${payload}`
  // Simple HMAC-like signature (use proper crypto in production)
  let hash = 0
  const combined = data + JWT_SECRET
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return base64UrlEncode(hash.toString())
}

export function createToken(payload: { userId: string; email: string }): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadStr = base64UrlEncode(JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }))
  const signature = createSignature(header, payloadStr)
  return `${header}.${payloadStr}.${signature}`
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const [header, payload, signature] = token.split(".")
    const expectedSignature = createSignature(header, payload)
    
    if (signature !== expectedSignature) {
      return null
    }
    
    const decoded = JSON.parse(base64UrlDecode(payload))
    
    if (decoded.exp < Date.now()) {
      return null
    }
    
    return { userId: decoded.userId, email: decoded.email }
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

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}
