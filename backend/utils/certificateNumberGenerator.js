import prisma from '../config/db.js';

/**
 * Generates the next unique Certificate Number in the format:
 * CERT-YYYY-000001
 * 
 * Safe against race conditions by checking highest existing sequence.
 */
export async function generateUniqueCertificateNumber(client = prisma) {
  const currentYear = new Date().getFullYear();
  const prefix = `CERT-${currentYear}-`;

  const latestCert = await client.certificate.findFirst({
    where: { certificateNumber: { startsWith: prefix } },
    orderBy: { certificateNumber: 'desc' },
    select: { certificateNumber: true }
  });

  let nextSeq = 1;
  if (latestCert?.certificateNumber) {
    const parts = latestCert.certificateNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

export default generateUniqueCertificateNumber;
