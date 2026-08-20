# PharmaFlow Strict Compliance & Audit Layer

## Purpose and regulatory positioning

This module provides a **21 CFR Part 11-style control framework** for the regulated workflows implemented in PharmaFlow. It is a technical control baseline, not a legal certification or a substitute for the customer’s predicate-rule assessment, quality-system procedures, validation governance, or regulatory advice. Each tenant must determine which electronic records it relies on for regulated activities and document that decision in its own SOPs and validation package. FDA’s scope guidance recommends that organizations document those determinations.[1]

The design aligns the platform with closed-system controls including system validation, authorized access, time-stamped audit evidence, retained records, authority checks, and documented change control.[2] Signature records manifest the signer, execution time, and meaning, and are cryptographically linked to the signed subject record.[3]

| Control objective | PharmaFlow implementation | Required customer operating evidence |
|---|---|---|
| Immutable regulated records | No update or delete procedures for visit logs, sample transactions, electronic signatures, or audit evidence. Corrections create a replacement record linked by an immutable revision record. | SOP defining correction, void, and supersession criteria. |
| Reason for change | Any superseding visit or compensating sample transaction requires a reason of at least ten characters and creates a `regulatedRecordRevisions` row. | Periodic review of corrections and reasons. |
| Two-component electronic signatures | New signatures require the active user’s local credential plus an explicit signing action. Credential verification time, signing-action time, meaning, subject, and intent are retained. | User identity-verification, credential-issuance, and signature-accountability policy. |
| Server time | Audit and signature timestamps are generated server-side, never accepted from the client device. The self-hosted host must synchronize its system clock through the organization’s approved NTP service. | NTP configuration, drift monitoring, incident handling, and periodic evidence. |
| Audit trail | Append-only hash-linked audit records include actor, event, old/new state, reason, server timestamp, and the prior-event hash. | Audit-trail review schedule and retention policy. |
| Access review | Authorized administrators and executives can generate immutable tenant access snapshots and record acceptance. | Recurring access-review cadence, reviewer independence, and finding disposition. |
| Change control | Proposed validated-workflow/business-rule changes require rationale, risk assessment, validation impact, proposed state, and explicit approval. | Change-control SOP, impact assessment, approval authority, and regression evidence. |
| Sample custody | Tenant-scoped allocation, hand-off, return, and adjustment history is reportable with product, lot, expiry, quantity, and event sequence. | Reconciliation procedure, inventory tolerances, and discrepancy investigation records. |

## Regulated record lifecycle

Visit logs, sample transactions, electronic signatures, and audit events are treated as append-only evidence. The application exposes create/list actions for these records and does not expose standard update or hard-delete paths. A correction is represented as a newly created regulated record that carries the predecessor identifier. The original record is retained and its relationship to the replacement is captured in `regulatedRecordRevisions`, including the mandated reason for change. This follows the Part 11 principle that changes must not obscure previously recorded information.[2]

> **Operational rule:** Do not correct a regulated record by direct database manipulation. Use a controlled supersession or compensating transaction and retain the documented reason.

## Electronic signature controls

For every new electronic signature, PharmaFlow requires both a credential verification and a separate intentional signing action. The signature evidence includes the signer, subject type and identifier, signature meaning, intent statement, credential-verification timestamp, signing-action timestamp, signature timestamp, and a record-binding hash. The system supports authorship, approval, review, and attestation meanings. These fields implement the signature manifestation and linking concepts in §§ 11.50 and 11.70.[3]

Legacy signature rows may lack the two new timestamp fields. They remain preserved as historical evidence and must be classified by the customer’s risk assessment; they must not be backfilled with invented values. New signature creation requires the strict two-component procedure.

## Time synchronization and trusted timestamps

The application timestamps audit and signature evidence on the server. Production deployment must use an organization-approved NTP source and monitor drift. If time synchronization cannot be evidenced, the customer should treat the affected period as a compliance incident and perform an impact assessment before relying on the affected audit evidence.

| Deployment check | Acceptance criterion | Evidence artifact |
|---|---|---|
| NTP configuration | Host has approved NTP/chrony/systemd-timesyncd configuration. | Configuration export and change-control record. |
| Time source reachable | Host reports synchronization to the approved source. | Time-sync status capture. |
| Clock drift | Drift is within the customer-defined validated tolerance. | Monitoring history and exception review. |
| Server-side origin | Client cannot submit audit or signature execution timestamps. | OQ test execution and API review. |

## Access review and change control

The compliance review center allows authorized roles to generate an immutable snapshot of tenant identities, account status, and role assignments. Reports capture privileged-access findings and can be explicitly accepted. Viewing audit or custody reports also creates an access audit event.

Workflow changes are proposed as append-only change-control evidence. Each proposal retains the prior state, proposed state, rationale, risk assessment, validation impact, preparer, and lifecycle state. Only an administrator can approve a proposal. The approval itself is separately auditable. Implementation must be completed through the customer’s change-control process and accompanied by risk-based regression evidence before promotion.

## Sample-distribution chain of custody

The chain-of-custody report is tenant-scoped and lists events in occurred-time sequence. Each reportable line carries the product, lot number, expiry, quantity, allocation/hand-off/return/adjustment event, source user, destination user, linked visit where applicable, and immutable record status. This report should be reconciled against physical inventory on the customer’s defined cadence.

## IQ/OQ/PQ validation starter pack

The following table is designed as a starting structure for customer-controlled qualification documentation. The customer must add approved protocol identifiers, test scripts, actual results, deviations, reviewer signatures, and release authorization.

| Qualification stage | Objective | Minimum evidence |
|---|---|---|
| IQ — Installation Qualification | Demonstrate that the approved self-hosted build, MySQL schema migration, NTP configuration, secrets, and restricted host access are installed as specified. | Versioned deployment manifest, database migration output, package lockfile, NTP status, environment-variable inventory without secret values, host hardening checklist. |
| OQ — Operational Qualification | Demonstrate controlled behavior under normal and error conditions. | Tests showing no regulated-record update/delete path, reason-for-change enforcement, rejected invalid credential, successful credential plus explicit signature action, role denial, cross-tenant denial, audit hash-chain creation, access-review generation/acceptance, and change-control approval. |
| PQ — Performance Qualification | Demonstrate intended use with representative trained users and controlled business scenarios. | Approved realistic visit correction, sample allocation-to-handoff reconciliation, periodic access review, workflow change request through approval, audit-log retrieval, and user acceptance evidence. |

## Release and retention checklist

Before a regulated production release, the customer should retain the approved change-control record, risk assessment, test results, discrepancy disposition, training evidence, backup/restore evidence, access review, and release approval. Records and audit trails must be retained for the period required by the applicable predicate rules and the customer’s approved retention schedule. FDA’s guidance recommends a documented risk-based approach that considers accuracy, reliability, integrity, availability, and authenticity.[1]

## References

[1] [FDA, *Part 11, Electronic Records; Electronic Signatures — Scope and Application*](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)

[2] [eCFR, 21 CFR § 11.10 — Controls for closed systems](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11)

[3] [eCFR, 21 CFR §§ 11.50, 11.70, and 11.200 — Signature manifestations, linking, components, and controls](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11)
