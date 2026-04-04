/**
 * Regional Power Template
 * For medium-sized nations with significant regional influence
 */
export const regionalPower = {
  name: 'Regional Power',
  description: 'A significant regional power with a capable military and growing economy.',
  tier: 'regional_power',
  data: {
    leader: 'Head of State',
    population: '50M',
    populationNumber: 50000000,
    
    economy: {
      gdp: 500000000000,         // 500 Billion
      budget: 75000000000,       // 75 Billion
      primaryCurrency: 'Dollars',
      currencies: {
        'Dollars': 100000000000,  // 100 Billion in treasury
      },
      inflation: 8,
    },
    
    resources: {
      'Oil': 2000,
      'Steel': 1500,
      'Food': 3000,
      'Aluminum': 800,
      'Rubber': 500,
      'Uranium': 50,
      'Rare Earth': 200,
      'Electronics': 400,
    },
    
    stability: 60,
    nukes: 0,
    
    military: {
      army: {
        troops: 200000,
        reserves: 150000,
        tanks: 2000,
        artillery: 1000,
        armoredVehicles: 5000,
        specialForces: 5000,
      },
      airforce: {
        jets: 500,
        bombers: 100,
        reconPlanes: 50,
        transportPlanes: 100,
        helicopters: 500,
      },
      navy: {
        carriers: 1,
        submarines: 15,
        destroyers: 20,
        frigates: 15,
        corvettes: 25,
        battleships: 0,
      },
    },
    
    spirits: [
      {
        name: 'Regional Ambition',
        description: 'Seeks to establish dominance in their sphere of influence.',
        effects: [
          { type: 'diplomacy_bonus', target: 'neighbors', value: 5, description: '+5 influence with neighbors' },
        ],
      },
    ],
  },
};

export default regionalPower;
