import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesCommand,
  DeleteFacesCommand,
  ListFacesCommand,
} from "@aws-sdk/client-rekognition";

export const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!;

/** Index a face from a public URL. ExternalImageId = camper ID so we can match back. */
export async function indexFace(camperId: string, imageUrl: string): Promise<string | null> {
  const res = await fetch(imageUrl);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());

  try {
    const result = await rekognitionClient.send(new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: buffer },
      ExternalImageId: camperId,
      MaxFaces: 1,
      DetectionAttributes: [],
    }));
    return result.FaceRecords?.[0]?.Face?.FaceId ?? null;
  } catch {
    return null;
  }
}

/** Remove all indexed faces for a camper (e.g. when profile photo changes). */
export async function removeFacesForCamper(camperId: string): Promise<void> {
  try {
    // Page through all faces and find ones belonging to this camper
    const faceIds: string[] = [];
    let nextToken: string | undefined;

    do {
      const result = await rekognitionClient.send(new ListFacesCommand({
        CollectionId: COLLECTION_ID,
        MaxResults: 1000,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }));
      for (const face of result.Faces ?? []) {
        if (face.ExternalImageId === camperId && face.FaceId) {
          faceIds.push(face.FaceId);
        }
      }
      nextToken = result.NextToken;
    } while (nextToken);

    if (faceIds.length > 0) {
      await rekognitionClient.send(new DeleteFacesCommand({
        CollectionId: COLLECTION_ID,
        FaceIds: faceIds,
      }));
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Search a group photo for ALL known faces.
 * Strategy: temporarily index every face in the photo, search each one
 * against the collection, then delete the temp faces.
 */
export async function searchFaces(
  imageUrl: string,
  threshold = 85
): Promise<{ camperId: string; confidence: number }[]> {
  const res = await fetch(imageUrl);
  if (!res.ok) return [];
  const buffer = Buffer.from(await res.arrayBuffer());

  const tempExternalId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let tempFaceIds: string[] = [];

  try {
    // Step 1: Index ALL faces in the photo (up to 20)
    const indexResult = await rekognitionClient.send(new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: buffer },
      ExternalImageId: tempExternalId,
      MaxFaces: 20,
      DetectionAttributes: [],
    }));

    tempFaceIds = (indexResult.FaceRecords ?? [])
      .map(r => r.Face?.FaceId!)
      .filter(Boolean);

    if (tempFaceIds.length === 0) return [];

    // Step 2: For each detected face, search for a matching profile in the collection
    const results: { camperId: string; confidence: number }[] = [];
    const foundCampers = new Set<string>();

    for (const faceId of tempFaceIds) {
      const searchResult = await rekognitionClient.send(new SearchFacesCommand({
        CollectionId: COLLECTION_ID,
        FaceId: faceId,
        FaceMatchThreshold: threshold,
        MaxFaces: 3,
      }));

      for (const match of searchResult.FaceMatches ?? []) {
        const camperId = match.Face?.ExternalImageId;
        // Skip temp faces, only match real camper profile faces
        if (camperId && !camperId.startsWith("temp-") && !foundCampers.has(camperId)) {
          foundCampers.add(camperId);
          results.push({ camperId, confidence: match.Similarity ?? 0 });
        }
      }
    }

    return results;
  } finally {
    // Step 3: Always clean up temp faces, even if something errored
    if (tempFaceIds.length > 0) {
      try {
        await rekognitionClient.send(new DeleteFacesCommand({
          CollectionId: COLLECTION_ID,
          FaceIds: tempFaceIds,
        }));
      } catch {
        // Non-fatal
      }
    }
  }
}
