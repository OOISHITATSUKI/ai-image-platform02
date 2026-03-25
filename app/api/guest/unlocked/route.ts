import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET: Fetch unlocked guest images for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

        const { data: images } = await supabaseAdmin
            .from("guest_generations")
            .select("id, generation_type, prompt, original_path, created_at")
            .eq("user_id", decoded.userId)
            .eq("unlocked", true)
            .order("created_at", { ascending: false })
            .limit(50);

        return NextResponse.json({ images: images || [] });
    } catch (error) {
        console.error("[Guest unlocked] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
