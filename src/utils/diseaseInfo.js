// Static, per-condition reference data.
//
// IMPORTANT: none of this is model output. The classifier returns a single
// label plus a confidence score, nothing more. Symptom chips, severity and
// treatment text are curated horticultural reference data keyed by that label.
// Keep it that way — presenting them as model-derived would overstate what the
// system actually does.

export const TARGET_SPECIES = 'Vanda sanderiana';

export const SEVERITY_LEVELS = {
  1: { label: 'Low', color: '#43a047' },
  2: { label: 'Mild', color: '#7cb342' },
  3: { label: 'Moderate', color: '#ef6c00' },
  4: { label: 'Severe', color: '#c62828' },
};

export const DISEASE_INFO = {
  bacterial_brown_spot: {
    displayName: 'Bacterial Brown Spot',
    status: 'Diseased',
    isHealthy: false,
    tags: ['Leaf discoloration', 'Water-soaked spots'],
    severity: 3,
    treatment:
      'Cut out infected tissue with a sterilised blade, cutting well into healthy tissue. Apply a copper-based bactericide every 7 days.',
    prevention:
      'Isolate the plant from healthy stock. Stop overhead watering and water the medium only. Improve air circulation.',
  },

  bacterial_soft_rot: {
    displayName: 'Bacterial Soft Rot',
    status: 'Diseased',
    isHealthy: false,
    tags: ['Mushy tissue', 'Rapid spread', 'Foul odour'],
    severity: 4,
    treatment:
      'Isolate immediately — this can kill the plant within days. Cut away all affected tissue with a sterilised blade.',
    prevention:
      'Keep the crown dry and avoid water pooling in new growth. Discard severely affected plants to protect the collection.',
  },

  tip_burn: {
    displayName: 'Leaf Tip Burn',
    status: 'Stressed',
    isHealthy: false,
    tags: ['Dry leaf tips', 'Usually abiotic'],
    severity: 1,
    treatment:
      'Flush the medium with clean water to clear fertiliser salts. Reduce fertiliser strength.',
    prevention:
      'Raise humidity and check light exposure. If tips keep browning after flushing, inspect the roots for rot.',
  },

  healthy: {
    displayName: 'Healthy',
    status: 'Healthy',
    isHealthy: true,
    tags: ['No visible symptoms'],
    severity: 0,
    treatment: 'No treatment needed.',
    prevention:
      'Maintain current watering and light. Check the undersides of leaves monthly for early symptoms.',
  },

healthy: {
  displayName: 'Healthy',
  status: 'Healthy',
  isHealthy: true,
  tags: ['No visible symptoms'],
  severity: 0,
  treatment: 'No treatment needed.',
  prevention:
    'Maintain current watering and light. Check the undersides of leaves monthly for early symptoms.',
},

  not_orchid: {
    displayName: 'Not an orchid',
    status: 'Unrecognised',
    isHealthy: false,
    tags: [],
    severity: 0,
    treatment: '',
    prevention: '',
  },
};