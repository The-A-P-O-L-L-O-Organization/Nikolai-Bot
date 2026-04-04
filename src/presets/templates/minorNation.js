/**
 * Minor Nation Template
 * For smaller nations with limited military and economic power
 */
export const minorNation = {
  name: 'Minor Nation',
  description: 'A smaller nation focused on development and survival.',
  tier: 'minor_nation',
  data: {
    leader: 'Leader',
    population: '10M',
    populationNumber: 10000000,
    
    economy: {
      gdp: 50000000000,          // 50 Billion
      budget: 7000000000,        // 7 Billion
      primaryCurrency: 'Dollars',
      currencies: {
        'Dollars': 10000000000,   // 10 Billion in treasury
      },
      inflation: 12,
    },
    
    resources: {
      'Oil': 200,
      'Steel': 150,
      'Food': 500,
      'Aluminum': 80,
      'Rubber': 50,
      'Uranium': 0,
      'Rare Earth': 20,
      'Electronics': 50,
    },
    
    stability: 50,
    nukes: 0,
    
    military: {
      army: {
        troops: 30000,
        reserves: 20000,
        tanks: 200,
        artillery: 100,
        armoredVehicles: 500,
        specialForces: 500,
      },
      airforce: {
        jets: 50,
        bombers: 10,
        reconPlanes: 10,
        transportPlanes: 20,
        helicopters: 50,
      },
      navy: {
        carriers: 0,
        submarines: 2,
        destroyers: 4,
        frigates: 6,
        corvettes: 10,
        battleships: 0,
      },
    },
    
    spirits: [
      {
        name: 'Developing Nation',
        description: 'A nation on the path to modernization and growth.',
        effects: [
          { type: 'population_growth', value: 2, description: '+2% population growth' },
        ],
      },
    ],
  },
};

export default minorNation;
