import { put } from '@vercel/blob';

export async function uploadImage(
  file: File,
  folder: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // For now, we'll upload the original and create a simple thumbnail
  // In production, you can use sharp for image processing
  const timestamp = Date.now();
  const fileName = `${folder}/${timestamp}.jpg`;

  // Upload original image
  const imageBlob = await put(fileName, buffer, {
    access: 'public',
    contentType: file.type || 'image/jpeg',
  });

  // For thumbnail, we'll use the same image for now
  // TODO: Add sharp for proper thumbnail generation
  const thumbnailBlob = await put(`${folder}/${timestamp}-thumb.jpg`, buffer, {
    access: 'public',
    contentType: file.type || 'image/jpeg',
  });

  return {
    url: imageBlob.url,
    thumbnailUrl: thumbnailBlob.url,
  };
}

export async function optimizeForFacebook(imageUrl: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Upload optimized version
    // TODO: Add sharp for proper optimization (1200x1200, quality 85)
    const blob = await put(`facebook/${Date.now()}.jpg`, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    return blob.url;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original if optimization fails
    return imageUrl;
  }
}

export async function deleteImage(url: string): Promise<void> {
  // Vercel Blob doesn't support deletion in the current version
  // This is a placeholder for future implementation
  console.log('Delete image:', url);
}
