import { RekognitionClient, CreateCollectionCommand } from "@aws-sdk/client-rekognition";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "director") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    await client.send(new CreateCollectionCommand({
      CollectionId: process.env.REKOGNITION_COLLECTION_ID!,
    }));
    return NextResponse.json({ success: true, message: "Collection created!" });
  } catch (err: any) {
    // ResourceAlreadyExistsException means it's already set up — that's fine
    if (err.name === "ResourceAlreadyExistsException") {
      return NextResponse.json({ success: true, message: "Collection already exists — ready to go!" });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
