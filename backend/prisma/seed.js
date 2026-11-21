import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CertiFlow database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.districtApproval.deleteMany();
  await prisma.qualityReview.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.trainingCentre.deleteMany();
  await prisma.district.deleteMany();

  console.log('🧹 Cleaned existing database tables');

  // 2. Hash default password
  const defaultPassword = await bcrypt.hash('Password@123', 10);

  // 3. Seed Districts
  const districtBengaluru = await prisma.district.create({
    data: {
      code: 'DIST-01',
      name: 'Bengaluru Urban',
      state: 'Pragati State'
    }
  });

  const districtMysuru = await prisma.district.create({
    data: {
      code: 'DIST-02',
      name: 'Mysuru Urban',
      state: 'Pragati State'
    }
  });

  console.log('📍 Seeded Districts: Bengaluru Urban, Mysuru Urban');

  // 4. Seed Training Centres
  const tcBengaluru = await prisma.trainingCentre.create({
    data: {
      code: 'TC-001',
      name: 'Pragati Skill Training Institute - Bengaluru Central',
      districtId: districtBengaluru.id,
      address: '104, Skill Development Corridor, MG Road, Bengaluru',
      contactNumber: '+91 98765 43210',
      email: 'tc.bengaluru@pragati.org'
    }
  });

  const tcMysuru = await prisma.trainingCentre.create({
    data: {
      code: 'TC-002',
      name: 'Pragati Vocational Excellence Centre - Mysuru',
      districtId: districtMysuru.id,
      address: '42, Heritage Tech Zone, Industrial Area, Mysuru',
      contactNumber: '+91 98765 43211',
      email: 'tc.mysuru@pragati.org'
    }
  });

  console.log('🏫 Seeded Training Centres: TC-001, TC-002');

  // 5. Seed Demo Users
  const userAnika = await prisma.user.create({
    data: {
      email: 'anika@pragati.org',
      password: defaultPassword,
      name: 'Anika Sharma',
      role: 'TRAINING_CENTRE',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id
    }
  });

  const userDev = await prisma.user.create({
    data: {
      email: 'dev@pragati.org',
      password: defaultPassword,
      name: 'Dev Patel',
      role: 'DISTRICT_OFFICER',
      districtId: districtBengaluru.id
    }
  });

  const userMeera = await prisma.user.create({
    data: {
      email: 'meera@pragati.org',
      password: defaultPassword,
      name: 'Meera Nair',
      role: 'DISTRICT_OFFICER',
      districtId: districtBengaluru.id
    }
  });

  const userKabir = await prisma.user.create({
    data: {
      email: 'kabir@pragati.org',
      password: defaultPassword,
      name: 'Kabir Rao',
      role: 'DISTRICT_OFFICER',
      districtId: districtBengaluru.id
    }
  });

  const userNeha = await prisma.user.create({
    data: {
      email: 'neha@pragati.org',
      password: defaultPassword,
      name: 'Neha Verma',
      role: 'QUALITY_TEAM'
    }
  });

  const userFarah = await prisma.user.create({
    data: {
      email: 'farah@pragati.org',
      password: defaultPassword,
      name: 'Farah Khan',
      role: 'STATE_OFFICE'
    }
  });

  console.log('👥 Seeded Demo Users: Anika, Dev, Meera, Kabir, Neha, Farah');

  // 6. Seed Batches across multiple workflow stages

  // Batch A: DRAFT Batch
  const batchDraft = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-001',
      batchName: 'Solar Electrician Technician - Q1',
      courseName: 'Solar Electrician Technician',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'DRAFT',
      candidateCount: 0
    }
  });

  // Batch B: DISTRICT_REVIEW (1 approval done by Dev, awaiting 2nd approval)
  const batchDistrictReview = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-002',
      batchName: 'Electric Vehicle Service Tech - Cohort 1',
      courseName: 'Electric Vehicle Service Technician',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'DISTRICT_REVIEW',
      submissionCycle: 1,
      candidateCount: 20,
      submittedAt: new Date(Date.now() - 3600000 * 12), // 12 hours ago
      lastActionAt: new Date(Date.now() - 3600000 * 6),
      districtApprovals: {
        create: [
          {
            officerId: userDev.id,
            decision: 'APPROVED',
            reason: 'Candidate attendance registers and practical evaluation logs verified.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 6)
          }
        ]
      }
    }
  });

  // Add sample candidates for Batch B
  const evCandidates = [];
  for (let i = 1; i <= 20; i++) {
    evCandidates.push({
      batchId: batchDistrictReview.id,
      candidateIdentifier: `EV-2026-${String(i).padStart(3, '0')}`,
      name: `EV Trainee ${i}`,
      email: `evtrainee${i}@example.com`,
      mobileNumber: `+9198000${String(10000 + i).slice(-5)}`,
      courseName: 'Electric Vehicle Service Technician',
      completionDate: new Date('2026-02-15')
    });
  }
  await prisma.candidate.createMany({ data: evCandidates });

  // Batch C: QUALITY_REVIEW (60 candidates >= 50 threshold; 2 District Approvals done; waiting for Neha)
  const batchQualityReview = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-003',
      batchName: 'Healthcare Assistant Support - Large Cohort',
      courseName: 'General Duty Healthcare Assistant',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'QUALITY_REVIEW',
      submissionCycle: 1,
      candidateCount: 60,
      submittedAt: new Date(Date.now() - 3600000 * 48), // 48 hours ago
      lastActionAt: new Date(Date.now() - 3600000 * 20),
      districtApprovals: {
        create: [
          {
            officerId: userDev.id,
            decision: 'APPROVED',
            reason: 'Hospital clinical logbooks and training hours confirmed.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 30)
          },
          {
            officerId: userMeera.id,
            decision: 'APPROVED',
            reason: 'Second district officer review completed. Hospital training verified.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 20)
          }
        ]
      }
    }
  });

  const healthcareCandidates = [];
  for (let i = 1; i <= 60; i++) {
    healthcareCandidates.push({
      batchId: batchQualityReview.id,
      candidateIdentifier: `HCA-2026-${String(i).padStart(3, '0')}`,
      name: `Healthcare Trainee ${i}`,
      email: `healthcare${i}@example.com`,
      mobileNumber: `+9198100${String(10000 + i).slice(-5)}`,
      courseName: 'General Duty Healthcare Assistant',
      completionDate: new Date('2026-02-20')
    });
  }
  await prisma.candidate.createMany({ data: healthcareCandidates });

  // Batch D: STATE_REVIEW (< 50 candidates, 2 District Approvals done, waiting for Farah)
  const batchStateReview = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-004',
      batchName: 'Data Analytics & Digital Office Assistant',
      courseName: 'Digital Office Assistant',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'STATE_REVIEW',
      submissionCycle: 1,
      candidateCount: 25,
      submittedAt: new Date(Date.now() - 3600000 * 18),
      lastActionAt: new Date(Date.now() - 3600000 * 4),
      districtApprovals: {
        create: [
          {
            officerId: userDev.id,
            decision: 'APPROVED',
            reason: 'Assessment records and assessment agency scores validated.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 8)
          },
          {
            officerId: userKabir.id,
            decision: 'APPROVED',
            reason: 'Second district review completed. Ready for state final approval.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 4)
          }
        ]
      }
    }
  });

  const daCandidates = [];
  for (let i = 1; i <= 25; i++) {
    daCandidates.push({
      batchId: batchStateReview.id,
      candidateIdentifier: `DOA-2026-${String(i).padStart(3, '0')}`,
      name: `Office Trainee ${i}`,
      email: `officetrainee${i}@example.com`,
      mobileNumber: `+9198200${String(10000 + i).slice(-5)}`,
      courseName: 'Digital Office Assistant',
      completionDate: new Date('2026-02-18')
    });
  }
  await prisma.candidate.createMany({ data: daCandidates });

  // Batch E: COMPLETED (fully approved, certificates generated, one valid demo certificate and one cancelled)
  const batchCompleted = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-005',
      batchName: 'Solar PV Installer Certified Cohort',
      courseName: 'Solar PV Installation Specialist',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'COMPLETED',
      submissionCycle: 1,
      candidateCount: 2,
      submittedAt: new Date(Date.now() - 3600000 * 72),
      lastActionAt: new Date(Date.now() - 3600000 * 24),
      districtApprovals: {
        create: [
          {
            officerId: userDev.id,
            decision: 'APPROVED',
            reason: 'All candidate records verified.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 48)
          },
          {
            officerId: userMeera.id,
            decision: 'APPROVED',
            reason: 'Field training photos and assessments verified.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 36)
          }
        ]
      }
    }
  });

  // Create candidates for Batch E
  const cand1 = await prisma.candidate.create({
    data: {
      batchId: batchCompleted.id,
      candidateIdentifier: 'SPV-2026-001',
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@example.com',
      mobileNumber: '+919876500001',
      courseName: 'Solar PV Installation Specialist',
      completionDate: new Date('2026-02-10')
    }
  });

  const cand2 = await prisma.candidate.create({
    data: {
      batchId: batchCompleted.id,
      candidateIdentifier: 'SPV-2026-002',
      name: 'Pooja Sundaram',
      email: 'pooja.sundaram@example.com',
      mobileNumber: '+919876500002',
      courseName: 'Solar PV Installation Specialist',
      completionDate: new Date('2026-02-10')
    }
  });

  // Certificate 1: VALID
  const cert1 = await prisma.certificate.create({
    data: {
      certificateNumber: 'CERT-2026-000001',
      candidateId: cand1.id,
      batchId: batchCompleted.id,
      issueDate: new Date(Date.now() - 3600000 * 24),
      verificationUrl: 'http://localhost:5173/verify/CERT-2026-000001',
      pdfFileName: 'CERT-2026-000001.pdf',
      status: 'VALID'
    }
  });

  // Certificate 2: CANCELLED (Demo cancelled certificate for immediate public verification test)
  const cert2 = await prisma.certificate.create({
    data: {
      certificateNumber: 'CERT-2026-000002',
      candidateId: cand2.id,
      batchId: batchCompleted.id,
      issueDate: new Date(Date.now() - 3600000 * 24),
      verificationUrl: 'http://localhost:5173/verify/CERT-2026-000002',
      pdfFileName: 'CERT-2026-000002.pdf',
      status: 'CANCELLED',
      cancelledAt: new Date(Date.now() - 3600000 * 2),
      cancelledById: userFarah.id,
      cancellationReason: 'Discrepancy in practical examination mark sheet found during state quality audit.'
    }
  });

  // Notifications for Certificates
  await prisma.notification.create({
    data: {
      candidateId: cand1.id,
      certificateId: cert1.id,
      recipientMobile: cand1.mobileNumber,
      channel: 'WHATSAPP',
      message: `Dear ${cand1.name}, congratulations! Your official Pragati Skills Mission certificate for ${cand1.courseName} is ready. Download here: http://localhost:5173/verify/${cert1.certificateNumber}`,
      downloadUrl: `http://localhost:5173/verify/${cert1.certificateNumber}`,
      status: 'SENT',
      attempts: 1,
      idempotencyKey: `notif-${cert1.id}-attempt-1`,
      sentAt: new Date(Date.now() - 3600000 * 23)
    }
  });

  // Batch F: RETURNED Batch
  const batchReturned = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-006',
      batchName: 'Hospitality & Front Desk Services',
      courseName: 'Front Office Hospitality Associate',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'RETURNED',
      submissionCycle: 1,
      candidateCount: 15,
      submittedAt: new Date(Date.now() - 3600000 * 36),
      lastActionAt: new Date(Date.now() - 3600000 * 12),
      returnReason: 'Trainee ID numbers in rows 11 to 14 do not match the state apprentice portal registrations. Please correct candidate IDs and resubmit.',
      districtApprovals: {
        create: [
          {
            officerId: userDev.id,
            decision: 'RETURNED',
            reason: 'Trainee ID numbers in rows 11 to 14 do not match the state apprentice portal registrations. Please correct candidate IDs and resubmit.',
            submissionCycle: 1,
            createdAt: new Date(Date.now() - 3600000 * 12)
          }
        ]
      }
    }
  });

  // Batch G: Delayed batch for testing delayed batch alerts (pending in DISTRICT_REVIEW > 30 hours)
  const batchDelayed = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-2026-007',
      batchName: 'Precision CNC Machining - Batch 1',
      courseName: 'CNC Machine Operator',
      trainingCentreId: tcBengaluru.id,
      districtId: districtBengaluru.id,
      status: 'DISTRICT_REVIEW',
      submissionCycle: 1,
      candidateCount: 18,
      submittedAt: new Date(Date.now() - 3600000 * 36), // 36 hours ago (> 24h threshold)
      lastActionAt: new Date(Date.now() - 3600000 * 36)
    }
  });

  console.log('📦 Seeded Batches: DRAFT, DISTRICT_REVIEW, QUALITY_REVIEW, STATE_REVIEW, COMPLETED, RETURNED, DELAYED');

  // 7. Seed Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: userAnika.id,
        userRole: 'TRAINING_CENTRE',
        action: 'BATCH_CREATED',
        entityType: 'BATCH',
        entityId: batchDraft.id,
        newStatus: 'DRAFT',
        reason: 'Initial batch draft created'
      },
      {
        userId: userAnika.id,
        userRole: 'TRAINING_CENTRE',
        action: 'BATCH_SUBMITTED',
        entityType: 'BATCH',
        entityId: batchDistrictReview.id,
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        reason: 'Submitted for district officer review'
      },
      {
        userId: userDev.id,
        userRole: 'DISTRICT_OFFICER',
        action: 'DISTRICT_APPROVED',
        entityType: 'BATCH',
        entityId: batchDistrictReview.id,
        previousStatus: 'SUBMITTED',
        newStatus: 'DISTRICT_REVIEW',
        reason: 'First district approval provided by Dev Patel'
      },
      {
        userId: userFarah.id,
        userRole: 'STATE_OFFICE',
        action: 'CERTIFICATE_CANCELLED',
        entityType: 'CERTIFICATE',
        entityId: cert2.id,
        previousStatus: 'VALID',
        newStatus: 'CANCELLED',
        reason: 'Discrepancy in practical examination mark sheet found during state quality audit.'
      }
    ]
  });

  console.log('📝 Seeded Initial Audit Logs');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
