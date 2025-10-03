import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDutchCities() {
  console.log('🇳🇱 Adding Dutch cities to the database...\n');

  const dutchCities = [
    'Alkmaar',
    'Amersfoort',
    'Amsterdam',
    'Apeldoorn',
    'Arnhem',
    'Assen',
    'Breda',
    'Delft',
    'Den Bosch',
    'Den Helder',
    'Deventer',
    'Dordrecht',
    'Eindhoven',
    'Enschede',
    'Groningen',
    'Haarlem',
    'Harderwijk',
    'Heerlen',
    'Helmond',
    'Hengelo',
    'Hoorn',
    'Leeuwarden',
    'Leiden',
    'Lelystad',
    'Maastricht',
    'Middelburg',
    'Nijmegen',
    'Oss',
    'Purmerend',
    'Roermond',
    'Rotterdam',
    'Schiedam',
    'Tilburg',
    'Utrecht',
    'Venlo',
    'Vlissingen',
    'Wageningen',
    'Weert',
    'Zwolle',
    'Zaanstad'
  ];

  try {
    // First, check existing cities to avoid duplicates
    console.log('🔍 Checking existing cities...');
    const existingCities = await prisma.city.findMany({
      select: { name: true }
    });
    const existingCityNames = existingCities.map(city => city.name);
    console.log(`Found ${existingCities.length} existing cities: ${existingCityNames.join(', ')}`);

    // Filter out cities that already exist
    const newCities = dutchCities.filter(cityName => !existingCityNames.includes(cityName));
    console.log(`\n📍 Cities to add: ${newCities.length}`);
    
    if (newCities.length === 0) {
      console.log('✅ All cities already exist in the database!');
      return;
    }

    // Add new cities
    let addedCount = 0;
    let skippedCount = 0;

    for (const cityName of newCities) {
      try {
        // Generate a unique city ID
        const cityId = `city_${cityName.toLowerCase().replace(/[\s'-]/g, '_')}`;
        
        await prisma.city.create({
          data: {
            id: cityId,
            name: cityName,
            country: 'Netherlands'
          }
        });
        
        console.log(`✅ Added: ${cityName} (ID: ${cityId})`);
        addedCount++;
        
      } catch {
        console.log(`⚠️ Skipped: ${cityName} (already exists or error)`);
        skippedCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ Cities added: ${addedCount}`);
    console.log(`⚠️ Cities skipped: ${skippedCount}`);
    console.log(`📍 Total cities in database: ${existingCities.length + addedCount}`);

    // Show final list of all cities
    console.log('\n🇳🇱 COMPLETE LIST OF CITIES IN DATABASE:');
    const allCities = await prisma.city.findMany({
      select: { name: true, id: true },
      orderBy: { name: 'asc' }
    });
    
    allCities.forEach((city, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${city.name} (${city.id})`);
    });

    console.log('\n🎉 Dutch cities successfully added to the database!');

  } catch (error) {
    console.error('❌ Error adding cities:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addDutchCities()
  .catch(console.error);