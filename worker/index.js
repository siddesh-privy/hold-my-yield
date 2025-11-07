require('dotenv').config();
const cron = require('node-cron');
const { checkAndRebalanceAllUsers } = require('./rebalance');

console.log('🚀 Hold My Yield - Rebalance Worker Started');
console.log('⏰ Schedule: Every 12 hours (6 AM & 6 PM UTC)');
console.log('📍 Environment:', process.env.NODE_ENV || 'production');

// Run twice daily: 6 AM and 6 PM UTC
cron.schedule('0 6,18 * * *', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Starting rebalance cycle...');
  console.log('🕐 Time:', new Date().toISOString());
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const results = await checkAndRebalanceAllUsers();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Rebalance cycle complete!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`👥 Users processed: ${results.processed}`);
    console.log(`💸 Rebalances executed: ${results.executed}`);
    console.log(`💰 Total value moved: $${results.totalValueMoved.toFixed(2)}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Rebalance cycle FAILED');
    console.error('='.repeat(60));
    console.error(error);
    console.error('='.repeat(60) + '\n');
  }
});

// Optional: Run on startup for testing
if (process.env.RUN_ON_STARTUP === 'true') {
  console.log('\n🧪 RUN_ON_STARTUP enabled - Running initial check...\n');
  checkAndRebalanceAllUsers()
    .then((results) => {
      console.log('✅ Initial check complete:', results);
    })
    .catch((err) => {
      console.error('❌ Initial check failed:', err);
    });
}

// Keep process alive
console.log('✨ Worker is running. Press Ctrl+C to stop.\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down worker...');
  process.exit(0);
});

