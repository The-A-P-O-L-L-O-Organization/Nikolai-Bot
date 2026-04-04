/**
 * Default random events
 */
export const defaultEvents = [
  // Positive Events
  {
    name: 'Economic Boom',
    description: 'A period of rapid economic growth brings prosperity!',
    category: 'economic',
    severity: 'positive',
    effects: [
      { type: 'currency', target: 'primary', value: 10, percentage: true, description: '+10% treasury' },
      { type: 'stability', value: 5, description: '+5% stability' },
    ],
    weight: 3,
  },
  {
    name: 'Oil Discovery',
    description: 'New oil reserves have been discovered!',
    category: 'economic',
    severity: 'positive',
    effects: [
      { type: 'resource', target: 'Oil', value: 1000, description: '+1000 oil' },
    ],
    weight: 2,
  },
  {
    name: 'Diplomatic Success',
    description: 'A major diplomatic victory improves international standing.',
    category: 'political',
    severity: 'positive',
    effects: [
      { type: 'stability', value: 10, description: '+10% stability' },
    ],
    weight: 2,
  },
  {
    name: 'Technological Breakthrough',
    description: 'Scientists make a major discovery!',
    category: 'random',
    severity: 'positive',
    effects: [
      { type: 'custom', description: 'Research progress +1 turn' },
    ],
    weight: 2,
  },
  {
    name: 'Population Boom',
    description: 'Birth rates surge as confidence in the nation grows.',
    category: 'social',
    severity: 'positive',
    effects: [
      { type: 'population', value: 5, percentage: true, description: '+5% population' },
      { type: 'stability', value: 3, description: '+3% stability' },
    ],
    weight: 2,
  },

  // Neutral Events
  {
    name: 'Election Year',
    description: 'Political tensions rise during election season.',
    category: 'political',
    severity: 'neutral',
    effects: [
      { type: 'stability', value: -5, description: '-5% stability' },
    ],
    weight: 3,
  },
  {
    name: 'Foreign Refugees',
    description: 'Refugees from a neighboring conflict seek asylum.',
    category: 'social',
    severity: 'neutral',
    effects: [
      { type: 'population', value: 2, percentage: true, description: '+2% population' },
      { type: 'stability', value: -3, description: '-3% stability' },
    ],
    weight: 2,
  },

  // Negative Events
  {
    name: 'Economic Recession',
    description: 'The economy enters a period of decline.',
    category: 'economic',
    severity: 'negative',
    effects: [
      { type: 'currency', target: 'primary', value: -10, percentage: true, description: '-10% treasury' },
      { type: 'stability', value: -5, description: '-5% stability' },
    ],
    weight: 3,
  },
  {
    name: 'Natural Disaster',
    description: 'A devastating natural disaster strikes the nation.',
    category: 'natural',
    severity: 'negative',
    effects: [
      { type: 'currency', target: 'primary', value: -5, percentage: true, description: '-5% treasury (relief efforts)' },
      { type: 'stability', value: -10, description: '-10% stability' },
    ],
    weight: 2,
  },
  {
    name: 'Military Scandal',
    description: 'A scandal rocks the military establishment.',
    category: 'military',
    severity: 'negative',
    effects: [
      { type: 'stability', value: -8, description: '-8% stability' },
    ],
    weight: 2,
  },
  {
    name: 'Workers Strike',
    description: 'Labor strikes disrupt production.',
    category: 'social',
    severity: 'negative',
    effects: [
      { type: 'resource', target: 'Steel', value: -200, description: '-200 steel' },
      { type: 'stability', value: -5, description: '-5% stability' },
    ],
    weight: 3,
  },
  {
    name: 'Epidemic',
    description: 'Disease spreads through the population.',
    category: 'natural',
    severity: 'negative',
    effects: [
      { type: 'population', value: -2, percentage: true, description: '-2% population' },
      { type: 'stability', value: -10, description: '-10% stability' },
    ],
    weight: 2,
  },

  // Catastrophic Events
  {
    name: 'Civil Unrest',
    description: 'Widespread protests and riots threaten the government.',
    category: 'political',
    severity: 'catastrophic',
    effects: [
      { type: 'stability', value: -25, description: '-25% stability' },
      { type: 'currency', target: 'primary', value: -15, percentage: true, description: '-15% treasury' },
    ],
    conditions: { maxStability: 40 },
    weight: 1,
  },
  {
    name: 'Famine',
    description: 'Crop failures lead to widespread starvation.',
    category: 'natural',
    severity: 'catastrophic',
    effects: [
      { type: 'resource', target: 'Food', value: -500, description: '-500 food' },
      { type: 'population', value: -5, percentage: true, description: '-5% population' },
      { type: 'stability', value: -20, description: '-20% stability' },
    ],
    weight: 1,
  },
  {
    name: 'Market Crash',
    description: 'Financial markets collapse, devastating the economy.',
    category: 'economic',
    severity: 'catastrophic',
    effects: [
      { type: 'currency', target: 'primary', value: -25, percentage: true, description: '-25% treasury' },
      { type: 'stability', value: -15, description: '-15% stability' },
    ],
    weight: 1,
  },
];

export default defaultEvents;
