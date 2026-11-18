import { NextResponse } from "next/server";
import { LAPTOP_LISTING_URL } from "@/lib/laptops";
import { parseLaptopListing } from "@/lib/parser/parseLaptopListing";
import type { LiveLaptopsResponse } from "@/types/live-laptop";

export async function GET() {
  try {
    const response = await fetch(LAPTOP_LISTING_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ASPC-RTS-Tool)" },
    });
    if (!response.ok) throw new Error(`Website returned ${response.status}`);
    const body: LiveLaptopsResponse = {
      products: parseLaptopListing(await response.text()), fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("Laptop listing could not be loaded:", error instanceof Error ? error.message : error);
    const body: LiveLaptopsResponse = {
      products: [], fetchedAt: new Date().toISOString(),
      error: "Could not load the laptop listing. Try again or open the website listing.",
    };
    return NextResponse.json(body, { status: 502 });
  }
}
