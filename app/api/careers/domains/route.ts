import { NextResponse } from "next/server"
import { getCareersList } from "@/lib/careers-data"

export async function GET() {
  try {
    const careers = await getCareersList()
    
    // Get unique domains from careers
    const domainsSet = new Set<string>()
    careers.forEach((career) => {
      if (career.domain) {
        domainsSet.add(career.domain)
      }
    })
    
    // Sort and add "All Domains" at the beginning
    const domains = ["All Domains", ...Array.from(domainsSet).sort()]
    
    return NextResponse.json({ domains })
  } catch (error) {
    console.error("Get domains error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
