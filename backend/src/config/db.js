import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../rvseco.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Helper to run database queries using Promises
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize and seed tables
export const initDb = async () => {
  try {
    // 1. Create Rates table
    await run(`CREATE TABLE IF NOT EXISTS rates (
      key TEXT PRIMARY KEY,
      value REAL
    )`);

    // Create Users table
    await run(`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT,
      status TEXT
    )`);

    // 2. Create Divisions table
    await run(`CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      name TEXT,
      vehicles INTEGER,
      active_vehicles INTEGER
    )`);

    // 3. Create Vehicles table
    await run(`CREATE TABLE IF NOT EXISTS vehicles (
      number TEXT PRIMARY KEY,
      type TEXT,
      regular_driver TEXT,
      division TEXT
    )`);


    // 4. Create Drivers table
    await run(`CREATE TABLE IF NOT EXISTS drivers (
      name TEXT PRIMARY KEY,
      phone TEXT,
      is_regular INTEGER
    )`);

    // 5. Create Records table
    await run(`CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      receipt_no TEXT,
      date_time TEXT,
      division TEXT,
      division_name TEXT,
      vehicle_type TEXT,
      vehicle_no TEXT,
      driver TEXT,
      plastic REAL,
      cardboard REAL,
      glass REAL,
      others REAL,
      total_weight REAL,
      total_amount REAL,
      rates_used TEXT,
      gps TEXT,
      status TEXT
    )`);

    // Self-healing migrations for additional payment columns
    await run(`ALTER TABLE records ADD COLUMN amount_paid REAL DEFAULT 0`).catch(() => {});
    await run(`ALTER TABLE records ADD COLUMN balance_amount REAL DEFAULT 0`).catch(() => {});
    await run(`ALTER TABLE vehicles ADD COLUMN division TEXT`).catch(() => {});
    await run(`ALTER TABLE establishments ADD COLUMN status TEXT DEFAULT 'active'`).catch(() => {});
    await run(`ALTER TABLE establishments ADD COLUMN revisit_date TEXT`).catch(() => {});
    await run(`ALTER TABLE establishments ADD COLUMN last_billed_month TEXT`).catch(() => {});
    await run(`UPDATE establishments SET status = 'inactive' WHERE monthly_fee = 0 OR monthly_fee IS NULL`).catch(() => {});

    // 6. Create Establishments table
    await run(`CREATE TABLE IF NOT EXISTS establishments (
      id TEXT PRIMARY KEY,
      name TEXT,
      proprietor TEXT,
      phone TEXT,
      monthly_fee REAL,
      penalty REAL,
      balance REAL,
      route_id INTEGER,
      route_name TEXT,
      status TEXT DEFAULT 'active',
      revisit_date TEXT,
      last_billed_month TEXT
    )`);

    // 7. Create Establishment Payments table
    await run(`CREATE TABLE IF NOT EXISTS establishment_payments (
      id TEXT PRIMARY KEY,
      receipt_no TEXT,
      date_time TEXT,
      establishment_id TEXT,
      establishment_name TEXT,
      amount_paid REAL,
      payment_mode TEXT,
      remarks TEXT,
      collector_name TEXT,
      collector_id TEXT
    )`);


    // --- SEED INITIAL DATA IF EMPTY ---
    
    // Seed Rates
    const ratesCount = await get(`SELECT COUNT(*) as count FROM rates`);
    if (ratesCount.count === 0) {
      await run(`INSERT INTO rates (key, value) VALUES 
        ('plastic', 16.0),
        ('cardboard', 10.0),
        ('glass', 3.0),
        ('others', 3.0)`);
      console.log('Seeded default rates.');
    }
    await run(`UPDATE rates SET value = 3.0 WHERE key = 'others' AND value = 4.0`);
    await run(`INSERT OR IGNORE INTO rates (key, value) VALUES ('others_iron', 25.0)`);
    await run(`INSERT OR IGNORE INTO rates (key, value) VALUES ('others_babybox', 3.0)`);
    await run(`INSERT OR IGNORE INTO rates (key, value) VALUES ('others_blackplastic', 3.0)`);

    // Seed Users
    await run(`INSERT OR IGNORE INTO users (username, password, role, status) VALUES 
      ('admin_drcc', 'admin123', 'admin_drcc', 'active'),
      ('admin_est', 'admin123', 'admin_est', 'active'),
      ('operator_drcc', 'operator123', 'operator_drcc', 'active'),
      ('operator_est', 'operator123', 'operator_est', 'active')`);
    console.log('Ensured default users are seeded.');

    // Migrate all division names and records to uniform Division-X format
    for (let i = 1; i <= 60; i++) {
      await run(`UPDATE divisions SET name = ? WHERE id = ?`, [`Division-${i}`, String(i)]);
      await run(`UPDATE records SET division_name = ? WHERE division = ?`, [`Division-${i}`, String(i)]);
    }

    // Seed Divisions
    const divisionsCount = await get(`SELECT COUNT(*) as count FROM divisions`);
    if (divisionsCount.count === 0) {
      const defaultDivisions = [
        { id: '43', name: 'Division-43', vehicles: 3, active_vehicles: 3 },
        { id: '44', name: 'Division-44', vehicles: 4, active_vehicles: 3 },
        { id: '45', name: 'Division-45', vehicles: 2, active_vehicles: 2 },
        { id: '46', name: 'Division-46', vehicles: 5, active_vehicles: 4 },
        { id: '47', name: 'Division-47', vehicles: 3, active_vehicles: 2 },
        { id: '48', name: 'Division-48', vehicles: 3, active_vehicles: 3 }
      ];
      for (const d of defaultDivisions) {
        await run(`INSERT INTO divisions (id, name, vehicles, active_vehicles) VALUES (?, ?, ?, ?)`, 
          [d.id, d.name, d.vehicles, d.active_vehicles]);
      }
      console.log('Seeded default divisions.');
    }

    // Seed Vehicles and Drivers skipped (custom Excel data used instead)
    console.log('Dummy vehicle and driver seeding skipped to prioritize Excel import.');


    // Seed Records (including June 20 operator table records & 51 June 26 dashboard records)
    const recordsCount = await get(`SELECT COUNT(*) as count FROM records`);
    if (recordsCount.count === 0) {
      const seedRecords = generateSeedRecords();
      for (const r of seedRecords) {
        await run(`INSERT INTO records (
          id, receipt_no, date_time, division, division_name, vehicle_type, vehicle_no, driver,
          plastic, cardboard, glass, others, total_weight, total_amount, rates_used, gps, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          r.id, r.receiptNo, r.dateTime, r.division, r.divisionName, r.vehicleType, r.vehicleNo, r.driver,
          r.plastic, r.cardboard, r.glass, r.others, r.totalWeight, r.totalAmount, 
          JSON.stringify(r.ratesUsed), JSON.stringify(r.gps), r.status
        ]);
      }
      console.log(`Seeded ${seedRecords.length} default records.`);
    }

    // Seed Establishments from JSON if empty
    const establishmentsCount = await get(`SELECT COUNT(*) as count FROM establishments`);
    if (establishmentsCount.count === 0) {
      try {
        const jsonPath = path.resolve(__dirname, 'establishments.json');
        if (fs.existsSync(jsonPath)) {
          const rawData = fs.readFileSync(jsonPath, 'utf8');
          const ests = JSON.parse(rawData);
          console.log(`Seeding ${ests.length} establishments from JSON...`);
          
          await new Promise((resolve, reject) => {
            db.serialize(() => {
              const stmt = db.prepare(`INSERT INTO establishments (
                id, name, proprietor, phone, monthly_fee, penalty, balance, route_id, route_name, status, last_billed_month
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
              
              const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
              ests.forEach(e => {
                stmt.run(
                  e.id,
                  e.name,
                  e.proprietor || '',
                  e.phone || '',
                  parseFloat(e.monthlyFee) || 0,
                  parseFloat(e.penalty) || 0,
                  parseFloat(e.previousBalance) || 0,
                  parseInt(e.routeId) || 1,
                  e.routeName,
                  e.status || 'active',
                  e.lastBilledMonth || currentMonthKey
                );
              });
              stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          });
          console.log('Finished seeding establishments.');
        } else {
          console.log('establishments.json seed file not found, skipping seeding.');
        }
      } catch (err) {
        console.error('Error seeding establishments from JSON:', err.message);
      }
    }

    // Seed Establishment Payments if empty
    const paymentsCount = await get(`SELECT COUNT(*) as count FROM establishment_payments`);
    if (paymentsCount.count === 0) {
      const ests = await query(`SELECT * FROM establishments WHERE monthly_fee > 0`);
      if (ests.length > 0) {
        console.log('Seeding establishment payments in SQLite...');
        const seedPmts = generateSeedEstablishmentPayments(ests.map(e => ({
          id: e.id,
          name: e.name,
          monthlyFee: e.monthly_fee
        })));
        for (const p of seedPmts) {
          await run(`INSERT INTO establishment_payments (
            id, receipt_no, date_time, establishment_id, establishment_name, 
            amount_paid, payment_mode, remarks, collector_name, collector_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            p.id, p.receiptNo, p.dateTime, p.establishmentId, p.establishmentName,
            p.amountPaid, p.paymentMode, p.remarks, p.collectorName, p.collectorId
          ]);
        }
        console.log(`Seeded ${seedPmts.length} establishment payments.`);
      }
    }

  } catch (err) {
    console.error('Error initializing tables:', err.message);
  }
};

// Seed generator copy to match the EXACT dashboard sum calculations
const generateSeedRecords = () => {
  return [];
};

const generateSeedEstablishmentPayments = (establishments) => {
  return [];
};

export default db;
