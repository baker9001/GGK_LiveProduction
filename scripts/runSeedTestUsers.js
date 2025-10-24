/**
 * Node.js Runner for Test Data Seeding
 *
 * This script compiles and runs the TypeScript seeding script
 * Run with: node scripts/runSeedTestUsers.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Test Data Seeding...\n');

const scriptPath = path.join(__dirname, 'seedTestUsers.ts');

try {
  console.log('📦 Running TypeScript script with tsx...\n');

  // Use npx tsx to run TypeScript directly
  execSync(`npx tsx "${scriptPath}"`, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  console.log('\n✅ Seeding completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Failed to run seeding script');
  console.error('\n💡 If tsx is not available, install it with: npm install -D tsx');
  console.error('💡 Or run directly: npx tsx scripts/seedTestUsers.ts');
  process.exit(1);
}
