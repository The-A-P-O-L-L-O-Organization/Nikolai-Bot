/**
 * Example spirits that can be applied to nations
 */
export const defaultSpirits = [
  // Military Spirits
  {
    name: 'Militaristic Tradition',
    description: 'A long history of military excellence and martial culture.',
    effects: [
      { type: 'military_modifier', target: 'army', value: 10, description: '+10% army effectiveness' },
      { type: 'production_speed', target: 'army', value: 10, description: '+10% army production speed' },
    ],
  },
  {
    name: 'Naval Dominance',
    description: 'Rules the waves with an unmatched navy.',
    effects: [
      { type: 'military_modifier', target: 'navy', value: 15, description: '+15% naval effectiveness' },
      { type: 'maintenance_modifier', target: 'navy', value: -10, description: '-10% naval maintenance' },
    ],
  },
  {
    name: 'Air Superiority',
    description: 'Dominates the skies with advanced aircraft.',
    effects: [
      { type: 'military_modifier', target: 'airforce', value: 15, description: '+15% airforce effectiveness' },
    ],
  },
  {
    name: 'Nuclear Power',
    description: 'Possesses a significant nuclear arsenal.',
    effects: [
      { type: 'diplomacy_bonus', target: 'all', value: 5, description: '+5 diplomatic leverage (MAD)' },
      { type: 'stability_modifier', value: -5, description: '-5% stability (nuclear tension)' },
    ],
  },

  // Economic Spirits
  {
    name: 'Industrial Powerhouse',
    description: 'A massive industrial base capable of producing at scale.',
    effects: [
      { type: 'production_speed', value: 20, description: '+20% production speed' },
      { type: 'resource_income', target: 'Steel', value: 200, description: '+200 steel per turn' },
    ],
  },
  {
    name: 'Trade Empire',
    description: 'Controls major trade routes and commerce.',
    effects: [
      { type: 'income_modifier', value: 15, description: '+15% income' },
      { type: 'resource_income', target: 'Electronics', value: 100, description: '+100 electronics per turn' },
    ],
  },
  {
    name: 'Oil Baron',
    description: 'Sits atop vast oil reserves.',
    effects: [
      { type: 'resource_income', target: 'Oil', value: 500, description: '+500 oil per turn' },
      { type: 'income_modifier', value: 10, description: '+10% income from oil exports' },
    ],
  },
  {
    name: 'Economic Crisis',
    description: 'Currently suffering from economic instability.',
    effects: [
      { type: 'income_modifier', value: -20, description: '-20% income' },
      { type: 'stability_modifier', value: -10, description: '-10% stability' },
    ],
  },

  // Political/Social Spirits
  {
    name: 'Beacon of Democracy',
    description: 'A shining example of democratic values.',
    effects: [
      { type: 'stability_modifier', value: 10, description: '+10% stability' },
      { type: 'diplomacy_bonus', target: 'democracies', value: 15, description: '+15 relations with democracies' },
    ],
  },
  {
    name: 'Totalitarian Regime',
    description: 'An iron-fisted government controls all aspects of society.',
    effects: [
      { type: 'stability_modifier', value: 5, description: '+5% stability (through fear)' },
      { type: 'production_speed', value: 10, description: '+10% production (forced labor)' },
      { type: 'diplomacy_bonus', target: 'democracies', value: -20, description: '-20 relations with democracies' },
    ],
  },
  {
    name: 'Revolutionary Fervor',
    description: 'The fires of revolution burn bright.',
    effects: [
      { type: 'military_modifier', target: 'army', value: 10, description: '+10% army morale' },
      { type: 'stability_modifier', value: -15, description: '-15% stability (unrest)' },
    ],
  },
  {
    name: 'Puppet State',
    description: 'Under the thumb of a greater power.',
    effects: [
      { type: 'diplomacy_bonus', target: 'master', value: 50, description: '+50 relations with overlord' },
      { type: 'income_modifier', value: -25, description: '-25% income (tribute)' },
    ],
  },

  // Research/Technology Spirits
  {
    name: 'Scientific Excellence',
    description: 'Leading the world in scientific research.',
    effects: [
      { type: 'research_speed', value: 25, description: '+25% research speed' },
    ],
  },
  {
    name: 'Secret Projects',
    description: 'Conducting classified research on advanced technologies.',
    effects: [
      { type: 'research_speed', value: 15, description: '+15% research speed' },
      { type: 'custom', description: 'Can research secret technologies' },
    ],
  },

  // Geographic Spirits
  {
    name: 'Island Nation',
    description: 'Protected by the sea, focused on naval power.',
    effects: [
      { type: 'military_modifier', target: 'navy', value: 10, description: '+10% naval effectiveness' },
      { type: 'stability_modifier', value: 5, description: '+5% stability (hard to invade)' },
    ],
  },
  {
    name: 'Landlocked',
    description: 'No access to the sea.',
    effects: [
      { type: 'income_modifier', value: -5, description: '-5% income (trade limitations)' },
      { type: 'military_modifier', target: 'army', value: 5, description: '+5% army effectiveness' },
    ],
  },
  {
    name: 'Vast Territory',
    description: 'Controls an enormous landmass.',
    effects: [
      { type: 'resource_income', target: 'Oil', value: 200, description: '+200 oil per turn' },
      { type: 'resource_income', target: 'Food', value: 300, description: '+300 food per turn' },
      { type: 'maintenance_modifier', value: 10, description: '+10% maintenance (infrastructure)' },
    ],
  },
];

export default defaultSpirits;
