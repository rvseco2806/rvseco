import { run, initDb } from './src/config/db.js';

const resetEstablishments = async () => {
  try {
    console.log('Starting reset of establishment payments and receipts...');
    
    // 1. Delete all payments/receipts history
    console.log('Clearing establishment_payments table...');
    const deletePayments = await run('DELETE FROM establishment_payments');
    console.log(`Cleared payments. Rows affected: ${deletePayments.changes}`);
    
    // 2. Delete all establishments to trigger re-seeding
    console.log('Clearing establishments table...');
    const deleteEsts = await run('DELETE FROM establishments');
    console.log(`Cleared establishments. Rows affected: ${deleteEsts.changes}`);
    
    // 3. Re-seed default establishments from JSON (starts them at current month, zero penalty/payments)
    console.log('Re-initializing and seeding establishments master list...');
    await initDb();
    
    console.log('Establishments payments and receipts reset successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
};

resetEstablishments();
