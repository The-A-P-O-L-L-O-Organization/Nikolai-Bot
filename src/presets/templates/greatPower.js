/**
 * Great Power Template - Based on USA example
 * For major world powers with large militaries and economies
 */
export const greatPower = {
  name: 'Great Power',
  description: 'A major world power with a large military, strong economy, and global influence.',
  tier: 'great_power',
  data: {
    leader: 'President',
    population: '300M',
    populationNumber: 300000000,
    
    economy: {
      gdp: 4000000000000,        // 4 Trillion
      budget: 600000000000,      // 600 Billion
      primaryCurrency: 'Dollars',
      currencies: {
        'Dollars': 1000000000000,  // 1 Trillion in treasury
        'Reichsmarks': 0,
        'Euros': 0,
      },
      inflation: 5,
    },
    
    resources: {
      'Oil': 10000,
      'Steel': 8000,
      'Food': 15000,
      'Aluminum': 5000,
      'Rubber': 3000,
      'Uranium': 500,
      'Rare Earth': 1000,
      'Electronics': 2000,
    },
    
    stability: 70,
    nukes: 7000,
    
    military: {
      army: {
        troops: 1000000,
        reserves: 600000,
        tanks: 15000,
        artillery: 5000,
        armoredVehicles: 40000,
        specialForces: 50000,
      },
      airforce: {
        jets: 6500,
        bombers: 1500,
        reconPlanes: 800,
        transportPlanes: 400,
        helicopters: 5000,
      },
      navy: {
        carriers: 10,
        submarines: 100,
        destroyers: 97,
        frigates: 74,
        corvettes: 81,
        battleships: 0,
      },
    },
    
    spirits: [
      {
        name: 'Arsenal of Democracy',
        description: 'A massive industrial base capable of producing military equipment at an unprecedented scale.',
        effects: [
          { type: 'production_speed', value: 15, description: '+15% production speed' },
          { type: 'resource_income', target: 'Steel', value: 500, description: '+500 steel per turn' },
        ],
      },
      {
        name: 'Global Superpower',
        description: 'Unmatched military projection capabilities and diplomatic influence worldwide.',
        effects: [
          { type: 'diplomacy_bonus', target: 'all', value: 10, description: '+10 diplomatic influence' },
          { type: 'military_modifier', target: 'navy', value: 10, description: '+10% naval effectiveness' },
        ],
      },
    ],
  },
};

export default greatPower;
