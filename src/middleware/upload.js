const fs = require('fs');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');
const { env } = require('../config/env');

fs.mkdirSync(env.uploadDir, { recursive: true });

function localStorage(folder) {
  const dir = `${env.uploadDir}/${folder}`;
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    }
  });
}

function makeUpload(folder, options = {}) {
  if (hasCloudinary) {
    return multer({
      storage: new CloudinaryStorage({
        cloudinary,
        params: {
          folder,
          resource_type: options.resourceType || 'auto',
          allowed_formats: options.allowedFormats
        }
      })
    });
  }
  return multer({ storage: localStorage(folder) });
}

function fileUrl(req, file) {
  if (!file) return '';
  return file.secure_url || file.path || `/uploads/${file.filename || ''}`;
}

function localFileUrl(req, file, folder) {
  if (!file) return '';
  if (file.secure_url || (file.path && file.path.startsWith('http'))) return file.secure_url || file.path;
  return `/uploads/${folder}/${file.filename}`;
}

const uploads = {
  profile: makeUpload('ZhiStudentProfiles', { allowedFormats: ['jpg', 'png', 'jpeg', 'pdf'] }),
  notice: makeUpload('ZhiNotices'),
  leave: makeUpload('ZhiLeaves'),
  staff: makeUpload('ZhiStaffFiles', { allowedFormats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'] }),
  note: makeUpload('ZhiNotes'),
  settings: makeUpload('ZhiSettings', { allowedFormats: ['jpg', 'png', 'jpeg', 'webp'] })
};

module.exports = { uploads, fileUrl, localFileUrl };
