import { storage } from "../config/firebase.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a buffer to Firebase Storage and returns the public URL.
 */
export async function uploadAvatar(
  buffer: Buffer,
  contentType: string = "image/jpeg",
): Promise<string> {
  const bucket = storage.bucket();
  const fileName = `avatars/generated/${uuidv4()}.jpg`;
  const file = bucket.file(fileName);

  await file.save(buffer, {
    metadata: {
      contentType,
    },
  });

  // Make the file publicly accessible
  await file.makePublic();

  console.log("Avatar uploaded to Firebase Storage");

  // Return the public URL
  return file.publicUrl();
}
