import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for stored certificates
const CERTIFICATES_DIR = path.resolve(__dirname, '..', 'certificates');
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// Ensure directories exist
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const storageService = {
  getCertificatePath: (fileName) => {
    // Prevent path traversal
    const safeName = path.basename(fileName);
    return path.join(CERTIFICATES_DIR, safeName);
  },

  certificateExists: (fileName) => {
    const filePath = storageService.getCertificatePath(fileName);
    return fs.existsSync(filePath);
  },

  getUploadsPath: () => UPLOADS_DIR,
  getCertificatesPath: () => CERTIFICATES_DIR
};

export default storageService;
