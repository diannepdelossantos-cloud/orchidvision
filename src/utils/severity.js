// Shared 3-tier severity legend. Not disease content — just the UI color
// and ordering for whichever level an admin picks in the disease knowledge
// base (see AdminDiseaseFormModal's SEVERITIES options, which should stay
// in sync with SEVERITY_ORDER).

export const SEVERITY_ORDER = ['Mild', 'Moderate', 'Severe'];

export const SEVERITY_COLORS = {
  Mild: '#7cb342',
  Moderate: '#ef6c00',
  Severe: '#c62828',
};
