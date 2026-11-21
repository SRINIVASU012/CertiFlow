import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import storageService from './storageService.js';
import logger from '../utils/logger.js';

/**
 * Generates an official, tamper-evident PDF Certificate for a candidate.
 */
export async function generateCertificatePdf({
  certificateNumber,
  candidateName,
  courseName,
  trainingCentreName,
  completionDate,
  issueDate = new Date(),
  verificationUrl
}) {
  const fileName = `${certificateNumber}.pdf`;
  const filePath = storageService.getCertificatePath(fileName);

  // If already generated, return early (idempotency guard)
  if (fs.existsSync(filePath)) {
    logger.info(`Certificate PDF ${fileName} already exists. Skipping recreation.`);
    return { fileName, filePath };
  }

  // Generate QR code data URL
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 140
  });

  return new Promise((resolve, reject) => {
    // Landscape A4 certificate (841.89 x 595.28 points)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // --- 1. Background and Borders ---
    // Outer Border (Navy)
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
      .lineWidth(3)
      .strokeColor('#0f2b5c')
      .stroke();

    // Inner Border (Gold)
    doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
      .lineWidth(1)
      .strokeColor('#c59b27')
      .stroke();

    // Decorative Corner Accents
    const drawCorner = (x, y, r) => {
      doc.circle(x, y, r).fillColor('#0f2b5c').fill();
    };
    drawCorner(35, 35, 4);
    drawCorner(pageWidth - 35, 35, 4);
    drawCorner(35, pageHeight - 35, 4);
    drawCorner(pageWidth - 35, pageHeight - 35, 4);

    // --- 2. Header & Branding ---
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('#0f2b5c')
      .text('PRAGATI SKILLS MISSION', { align: 'center', characterSpacing: 2 });

    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('#555555')
      .text('STATE SKILL DEVELOPMENT & CERTIFICATION INITIATIVE', { align: 'center', characterSpacing: 1.5 });

    doc.moveDown(0.8);
    // Gold ornamental dividing line
    doc.moveTo(pageWidth / 2 - 120, doc.y)
      .lineTo(pageWidth / 2 + 120, doc.y)
      .lineWidth(1.5)
      .strokeColor('#c59b27')
      .stroke();

    // --- 3. Certificate Title ---
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#c59b27')
      .text('CERTIFICATE OF VOCATIONAL COMPETENCY', { align: 'center', characterSpacing: 1 });

    doc.moveDown(0.8);
    doc.font('Helvetica')
      .fontSize(11)
      .fillColor('#333333')
      .text('This is to officially certify that', { align: 'center' });

    // --- 4. Candidate Name ---
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#0f2b5c')
      .text(candidateName.toUpperCase(), { align: 'center' });

    // Underline for Candidate Name
    doc.moveDown(0.2);
    doc.font('Helvetica')
      .fontSize(11)
      .fillColor('#333333')
      .text('has successfully completed the prescribed curriculum and practical assessment for', { align: 'center' });

    // --- 5. Course Name ---
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#1a5276')
      .text(courseName, { align: 'center' });

    // --- 6. Training Centre & Dates ---
    doc.moveDown(0.4);
    doc.font('Helvetica')
      .fontSize(10.5)
      .fillColor('#444444')
      .text(`Conducted by: ${trainingCentreName}`, { align: 'center' });

    const formattedCompletion = new Date(completionDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedIssue = new Date(issueDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.fontSize(10)
      .text(`Completion Date: ${formattedCompletion}  |  Date of Issuance: ${formattedIssue}`, { align: 'center' });

    // --- 7. Footer: Signatures, Certificate ID, and QR Code ---
    const footerY = pageHeight - 120;

    // Left: QR Code for Verification
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 50, footerY - 10, { width: 85, height: 85 });

    doc.font('Helvetica')
      .fontSize(7.5)
      .fillColor('#666666')
      .text('Scan QR to verify authenticity', 45, footerY + 78, { width: 95, align: 'center' });

    // Center: Certificate Identifiers & Authenticity Notice
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f2b5c')
      .text(`Certificate No: ${certificateNumber}`, 160, footerY + 15, { width: 340, align: 'center' });

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#666666')
      .text(`Verify online at: ${verificationUrl}`, 160, footerY + 30, { width: 340, align: 'center' })
      .text('This digitally issued document is recognized across accredited industry partners.', 160, footerY + 45, { width: 340, align: 'center' });

    // Right: Authorized Signatory
    doc.moveTo(pageWidth - 190, footerY + 40)
      .lineTo(pageWidth - 50, footerY + 40)
      .lineWidth(1)
      .strokeColor('#0f2b5c')
      .stroke();

    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f2b5c')
      .text('Director of Skill Certification', pageWidth - 190, footerY + 45, { width: 140, align: 'center' });

    doc.font('Helvetica')
      .fontSize(7.5)
      .fillColor('#666666')
      .text('Pragati Skills Mission Authority', pageWidth - 190, footerY + 58, { width: 140, align: 'center' });

    // Finalize PDF
    doc.end();

    writeStream.on('finish', () => {
      resolve({ fileName, filePath });
    });

    writeStream.on('error', (err) => {
      logger.error(`Error generating PDF for ${certificateNumber}: ${err.message}`);
      reject(err);
    });
  });
}
