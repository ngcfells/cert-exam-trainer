import type { ExamMeta } from '../../domain/types';

// VERIFY chunk 9: re-check every value against the official CompTIA DA0-002 objectives.
export const dataPlusMeta: ExamMeta = {
  code: 'DA0-002',
  version: '2',
  name: 'CompTIA Data+',
  maxQuestions: 90, // VERIFY chunk 9
  timeLimitMinutes: 90, // VERIFY chunk 9
  passingScore: 675, // VERIFY chunk 9
  // VERIFY chunk 9
  domains: [
    { id: '1', title: 'Data Concepts and Environments', weight: 20 },
    { id: '2', title: 'Data Acquisition and Preparation', weight: 22 },
    { id: '3', title: 'Data Analysis', weight: 24 },
    { id: '4', title: 'Visualization and Reporting', weight: 20 },
    { id: '5', title: 'Data Governance', weight: 14 },
  ],
  // Placeholder objectives, one per domain. VERIFY chunk 9
  objectives: [
    { id: '1.1', domainId: '1', title: 'Data Concepts and Environments (placeholder)' },
    { id: '2.1', domainId: '2', title: 'Data Acquisition and Preparation (placeholder)' },
    { id: '3.1', domainId: '3', title: 'Data Analysis (placeholder)' },
    { id: '4.1', domainId: '4', title: 'Visualization and Reporting (placeholder)' },
    { id: '5.1', domainId: '5', title: 'Data Governance (placeholder)' },
  ],
  // community: written by us; the official list lands in chunk 9.
  acronyms: [
    { term: 'API', expansion: 'Application Programming Interface', source: 'community' },
    { term: 'CSV', expansion: 'Comma-Separated Values', source: 'community' },
    { term: 'ETL', expansion: 'Extract, Transform, Load', source: 'community' },
    { term: 'JSON', expansion: 'JavaScript Object Notation', source: 'community' },
    { term: 'PII', expansion: 'Personally Identifiable Information', source: 'community' },
    { term: 'SQL', expansion: 'Structured Query Language', source: 'community' },
  ],
};
