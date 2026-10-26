/**
 * Feature flags, read at build time from NEXT_PUBLIC_FLAG_* environment variables ("1" turns a flag on). Off by default,
 * so an unfinished feature ships hidden. Turn one on locally in .env.local, or for the GitHub Pages build in the
 * workflow's env.
 */
export const flags = {
  /**
   * Split a usage-sheet photo into patients by their HN / AN barcodes (lib/patients.ts groupByPatient), so one photo
   * can hold several patients laid out in columns. Off: the earlier split by the gaps between sticker rows and
   * repeated REFs.
   */
  patientBarcodes: process.env.NEXT_PUBLIC_FLAG_PATIENT_BARCODES === "1",
};
