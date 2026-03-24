import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage engine — uploads directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pixora',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    use_filename: true,      // preserve original filename as part of public_id
    unique_filename: true,   // append random suffix to avoid collisions
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  } as Record<string, unknown>,
});

export { cloudinary, storage };
