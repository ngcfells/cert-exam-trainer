# CompTIA exam facts (survey, 2026-11-10)

A first survey of the exams not yet in the app, from web searches on 2026-11-10. Most figures come from CompTIA's
own pages as quoted in search results, some from third-party prep sites. **Nothing here is verified against the
exam objectives PDF.** Before an exam is registered, check every figure against the objectives PDF and CompTIA's
exam page, and record it in that exam's own `docs/sources/<code>.md`, as for DA0-002, CY0-001 and AT0-001.

Passing scores are on the 100 to 900 scale. "VERIFY" marks a figure with one source, a conflict, or a gap.

| Certification | Exam code | Questions (max) | Minutes | Passing score | Status |
| --- | --- | --- | --- | --- | --- |
| A+ Core 1 | 220-1201 (V15) | 90 | 90 | 675 | Current |
| A+ Core 2 | 220-1202 (V15) | 90 | 90 | 700 | Current |
| Tech+ | FC0-U71 | 70 or 75 (VERIFY) | 60 | 650 | Current |
| Network+ | N10-009 | 90 | 90 | 720 | Current |
| Security+ | SY0-701 | 90 | 90 | 750 | Current |
| Linux+ | XK0-006 (V8) | 90 | 90 | 720 (VERIFY) | Current; launched 2025-07-15 |
| Server+ | SK0-005 | 90 | 90 | 750 | Current; SK0-006 exists as a draft (copyright 2026) |
| Cloud+ | CV0-004 | 90 | 90 | 750 | Current |
| DataSys+ | DS0-001 | 90 | 90 | 700 | VERIFY: one source says DS0-002 launched 2026-10-13 and DS0-001 ends 2027-04-16 |
| CySA+ | CS0-004 (V4) | 85 | 165 | 750 | Current; launched 2026-06-23; CS0-003 retires 2026-12-22 |
| PenTest+ | PT0-003 | 90 | 165 (VERIFY) | 750 | Current |
| SecurityX (was CASP+) | CAS-005 | 90 | VERIFY | VERIFY (CASP+ was pass/fail) | Current |
| CloudNetX | CNX-001 | 90 | 165 | Pass/fail, no scaled score | Current; launched 2025-02-18 |
| DataAI (was DataX) | DY0-001 | VERIFY | VERIFY | VERIFY | Renamed 2026-01-21 |
| Project+ | PK0-005 | 90 | 90 | 710 | Current |
| SecOT+ | SOT-001 | TBD | TBD | TBD | Not out: due December 2026, objectives are a draft |
| AI Fundamentals, AI Essentials | none found | | | | Courses with a completion credential; no public exam blueprint found |

## Domain weights found

- **220-1201:** Mobile Devices 13, Networking 23, Hardware 25, Virtualization and Cloud Computing 11, Hardware and Network Troubleshooting 28. (Third-party; VERIFY.)
- **220-1202:** Operating Systems 28, Security 28, Software Troubleshooting 23, Operational Procedures 21. (Third-party; VERIFY.)
- **N10-009:** Networking Concepts 23, Network Implementation 20, Network Operations 19, Network Security 14, Network Troubleshooting 24. (One source differs; VERIFY.)
- **SY0-701:** General Security Concepts 12; Threats, Vulnerabilities, and Mitigations 22; Security Operations 28; the other two not found.
- **XK0-006:** Services and User Management 20, Security 18, Automation, Orchestration, and Scripting 17, Troubleshooting 22; System Management not found (23 by subtraction; VERIFY).
- **SK0-005:** Server Hardware Installation and Management 18, Server Administration 28; the other two not found.
- **CV0-004:** Cloud Architecture 23, Deployment 19, Security 19, Operations 17, Troubleshooting 12, DevOps Fundamentals 10. (One third-party source; others disagree; VERIFY.)
- **CS0-004:** Security Operations 34, Vulnerability Management 26, Incident Response and Management 24, Reporting and Communication 16. (Matches the owner's draft objectives PDF; 34 confirmed on CompTIA's page.)
- **CNX-001:** Network Architecture Design 31 (VERIFY), Network Security 28, Network Operations, Monitoring, and Performance 16, Network Troubleshooting 25.
- **SOT-001 (draft):** six domains; OT Cybersecurity Architecture, Design, and Engineering 18, OT Threat Intelligence 14, OT Security Operations 22, OT Incident Management 15; two not found.
- **DS0-001, PT0-003, PK0-005, FC0-U71, CAS-005, DY0-001:** sources conflict or give too little; take the weights from the objectives PDF.

## What a build needs

The app's method (see `docs/superpowers/plans/2026-11-01-chunk12-autoops.md`) starts from the exam objectives PDF:
objective titles and the official acronym list come from it, word for word. The objectives PDFs are free from
CompTIA but sit behind a sign-up form, so the owner downloads them into `_WorkingData/<exam>/`. Instructor decks
are optional reference material. On 2026-11-10 only CySA+ and AI Fundamentals had files there.

## Sources

- <https://www.comptia.org/en/certifications/cybersecurity-analyst/v4/>
- <https://www.comptia.org/en/certifications/linux/v7>
- <https://comptia.org/certifications/server>
- <https://comptia.org/certifications/Cloud>
- <https://www.comptia.org/en/certifications/datasys/v1/>
- <https://www.comptia.org/en-us/certifications/network/>
- <https://www.comptia.org/en-us/certifications/project/>
- <https://www.comptia.org/en-us/certifications/secot/>
- <https://www.comptia.org/en-au/certifications/cloudnetx/>
- <https://partners.comptia.org/certifications/comptia-tech-plus>
- <https://comptia.org/blog/the-updated-comptia-pentest-exam-pt0-003-is-here>
- <https://www.comptia.org/en-us/resources/comptia-product-roadmap/>
- <https://infosecinstitute.com/resources/a/whats-new-in-comptias-a-plus-exam/>
- <https://trainingcamp.com/articles/comptia-linux-xk0-006-exam-guide-domains-pbqs-and-a-study-approach-that-actually-works-in-2026/>
- <https://trainingcamp.com/what-is-server-plus/>
- <https://www.examcert.app/blog/cloud-plus-cv0-004-exam-guide-2026/>
- <https://trainingcamp.com/what-is-secot-plus/>
