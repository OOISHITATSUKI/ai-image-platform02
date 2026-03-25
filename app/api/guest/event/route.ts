import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    try {
        const { eventType, metadata } = await request.json();
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        if (!eventType) {
            return NextResponse.json({ error: "eventType is required" }, { status: 400 });
        }

        const validEvents = ["unlock_click", "banner_cta_click", "register_complete", "share_click"];
        if (!validEvents.includes(eventType)) {
            return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
        }

        await supabaseAdmin.from("guest_events").insert({
            guest_id: ip,
            event_type: eventType,
            metadata: metadata || {},
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Guest event] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
