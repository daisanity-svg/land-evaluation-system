import {auditResearchEvidence,validateEvidenceCase} from './researchEvidence.mjs';
import {verifySourcePages} from './sourceVerifier.mjs';
import {assessResearchProgress} from './researchProgress.mjs';
import {assessReportQuality} from './reportQuality.mjs';

// Both entry points must give the same result and reject mismatched evidence before reading sources.
export async function verifyResearchRequest(input) {
  const report=input && typeof input==='object' && !Array.isArray(input)?input:{};
  const evidence=report.research_evidence;
  const invalid=validateEvidenceCase(evidence,report);
  const sourceChecks=invalid.length?[]:await verifySourcePages(evidence);
  const audit=auditResearchEvidence(evidence,report,{sourceChecks});
  if(invalid.length)audit.errors=invalid;
  else if(typeof report.report_text==='string'&&report.report_text.trim())audit.report_quality=assessReportQuality(report,{sourceChecks});
  const workflow=assessResearchProgress(report,audit);
  const verification_status=audit.errors.length?'invalid_input':workflow.eligible_for_owner_review?'ready_for_owner_review':'needs_followup';
  return {...audit,workflow,verification_status,database_written:false};
}
