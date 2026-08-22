// The community publish/import gate (Era 5.5) - now the platform's ONE publish gate, living in
// src/validation/publishGate.ts since it also guards the library->air boundary (hosted publish,
// production export - docs/AGENT_SAVE.md). Re-exported here so the community callers
// (CommunityGallery, Home's publish door, the importer) keep their import path; the doctrine
// - strict, deterministic, the platform owns share safety, unsafe-JS findings are ERRORS because
// no human reviewer stands downstream in the self-service beta - is unchanged and documented
// where the function now lives.

export { publishGate } from '../validation/publishGate';
