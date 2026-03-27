import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Legacy multer storage engine — kept for backward compatibility
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pixora',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm', 'avi', 'mkv'],
    use_filename: true,
    unique_filename: true,
    resource_type: 'auto',
  } as Record<string, unknown>,
});

/**
 * Upload a raw buffer to Cloudinary, wrapping upload_stream in a Promise.
 * Compatible with Cloudinary v1 (cloudinary.uploader.upload_stream).
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export { cloudinary, storage };
