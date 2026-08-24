import express from 'express';
import { query, run, get, initDb } from '../config/db.js';

const router = express.Router();

// Helper to sync division vehicles count visually based on actual assignments
const syncDivisionVehicles = async () => {
  try {
    const divisions = await query(`SELECT * FROM divisions`);
    if (divisions.length === 0) return;
    
    for (let index = 0; index < divisions.length; index++) {
      const div = divisions[index];
      const countRow = await get(`SELECT COUNT(*) as cnt FROM vehicles WHERE division = ?`, [div.id]);
      const vCount = countRow ? countRow.cnt : 0;
      const active = vCount; // default all to active
      await run(`UPDATE divisions SET vehicles = ?, active_vehicles = ? WHERE id = ?`, [vCount, active, div.id]);
    }
  } catch (err) {
    console.error('Error syncing division stats:', err.message);
  }
};


// 1. Rates API
router.get('/rates', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM rates`);
    const rates = {};
    rows.forEach(r => {
      rates[r.key] = r.value;
    });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/rates', async (req, res) => {
  try {
    const { plastic, cardboard, glass, others, others_iron, others_babybox, others_blackplastic } = req.body;
    await run(`UPDATE rates SET value = ? WHERE key = 'plastic'`, [parseFloat(plastic) || 0]);
    await run(`UPDATE rates SET value = ? WHERE key = 'cardboard'`, [parseFloat(cardboard) || 0]);
    await run(`UPDATE rates SET value = ? WHERE key = 'glass'`, [parseFloat(glass) || 0]);
    await run(`UPDATE rates SET value = ? WHERE key = 'others'`, [parseFloat(others) || 0]);
    if (others_iron !== undefined) {
      await run(`UPDATE rates SET value = ? WHERE key = 'others_iron'`, [parseFloat(others_iron) || 0]);
    }
    if (others_babybox !== undefined) {
      await run(`UPDATE rates SET value = ? WHERE key = 'others_babybox'`, [parseFloat(others_babybox) || 0]);
    }
    if (others_blackplastic !== undefined) {
      await run(`UPDATE rates SET value = ? WHERE key = 'others_blackplastic'`, [parseFloat(others_blackplastic) || 0]);
    }
    res.json({ plastic, cardboard, glass, others, others_iron, others_babybox, others_blackplastic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Divisions API
router.get('/divisions', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM divisions`);
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      vehicles: r.vehicles,
      activeVehicles: r.active_vehicles
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/divisions', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const rows = await query(`SELECT MAX(CAST(id AS INTEGER)) as maxId FROM divisions`);
    const nextId = String((rows[0].maxId || 0) + 1);

    await run(`INSERT INTO divisions (id, name, vehicles, active_vehicles) VALUES (?, ?, 0, 0)`, [nextId, name]);
    res.json({ id: nextId, name, vehicles: 0, activeVehicles: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/divisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM divisions WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Vehicles API
router.get('/vehicles', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM vehicles`);
    res.json(rows.map(r => ({
      type: r.type,
      number: r.number,
      regularDriver: r.regular_driver,
      division: r.division
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/vehicles', async (req, res) => {
  try {
    const { type, number, regularDriver, division } = req.body;
    if (!type || !number || !regularDriver || !division) {
      return res.status(400).json({ error: 'All fields (type, number, regularDriver, division) are required' });
    }
    await run(`INSERT INTO vehicles (number, type, regular_driver, division) VALUES (?, ?, ?, ?)`, [number, type, regularDriver, division]);
    await syncDivisionVehicles();
    res.json({ type, number, regularDriver, division });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/vehicles/:number', async (req, res) => {
  try {
    const { number } = req.params;
    await run(`DELETE FROM vehicles WHERE number = ?`, [number]);
    await syncDivisionVehicles();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Drivers API
router.get('/drivers', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM drivers`);
    res.json(rows.map(r => ({
      name: r.name,
      phone: r.phone,
      isRegular: r.is_regular === 1
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/drivers', async (req, res) => {
  try {
    const { name, phone, isRegular } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and Phone are required' });

    await run(`INSERT INTO drivers (name, phone, is_regular) VALUES (?, ?, ?)`, 
      [name, phone, isRegular ? 1 : 0]);
    res.json({ name, phone, isRegular });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/drivers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    await run(`DELETE FROM drivers WHERE name = ?`, [name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Records API
router.get('/records', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM records ORDER BY date_time DESC`);
    res.json(rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      dateTime: r.date_time,
      division: r.division,
      divisionName: r.division_name,
      vehicleType: r.vehicle_type,
      vehicleNo: r.vehicle_no,
      driver: r.driver,
      plastic: r.plastic,
      cardboard: r.cardboard,
      glass: r.glass,
      others: r.others,
      totalWeight: r.total_weight,
      totalAmount: r.total_amount,
      amountPaid: r.amount_paid || 0,
      balanceAmount: r.balance_amount || 0,
      ratesUsed: JSON.parse(r.rates_used || '{}'),
      gps: JSON.parse(r.gps || 'null'),
      status: r.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/records', async (req, res) => {
  try {
    const record = req.body;
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `DRCC${dd}${mm}${yy}`;

    const matches = await query(`SELECT COUNT(*) as count FROM records WHERE receipt_no LIKE ?`, [`${datePrefix}%`]);
    const nextSeq = String(matches[0].count + 1).padStart(4, '0');
    const receiptNo = `${datePrefix}${nextSeq}`;

    const id = record.id || receiptNo;
    const receiptNoFinal = record.receiptNo || receiptNo;
    const dateTime = record.dateTime || new Date().toISOString();
    const status = record.status || 'Completed';

    await run(`INSERT OR IGNORE INTO records (
      id, receipt_no, date_time, division, division_name, vehicle_type, vehicle_no, driver,
      plastic, cardboard, glass, others, total_weight, total_amount, amount_paid, balance_amount, rates_used, gps, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, receiptNoFinal, dateTime, record.division, record.divisionName, record.vehicleType, record.vehicleNo, record.driver,
      parseFloat(record.plastic) || 0, parseFloat(record.cardboard) || 0, parseFloat(record.glass) || 0, parseFloat(record.others) || 0,
      parseFloat(record.totalWeight) || 0, parseFloat(record.totalAmount) || 0,
      parseFloat(record.amountPaid) || 0, parseFloat(record.balanceAmount) || 0,
      JSON.stringify(record.ratesUsed), JSON.stringify(record.gps), status
    ]);

    res.json({
      id,
      receiptNo: receiptNoFinal,
      dateTime,
      status,
      ...record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to process monthly arrears carry-forward
const processRowArrears = async (r) => {
  if (!r || r.status === 'inactive' || !r.monthly_fee || r.monthly_fee <= 0) {
    if (r) r.active_period_paid = 0;
    return r;
  }
  const today = new Date();
  const currentY = today.getFullYear();
  const currentM = today.getMonth() + 1;

  // The active billing month (e.g. July for August collection)
  const activeMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const activeMonthName = activeMonthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' }); // e.g. "July 2026"
  const activeMonthKey = `${activeMonthDate.getFullYear()}-${String(activeMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Query active period payments
  const pmtRow = await get(`SELECT SUM(amount_paid) as total FROM establishment_payments WHERE establishment_id = ? AND billing_period LIKE ?`, [r.id, `%${activeMonthName}%`]);
  r.active_period_paid = pmtRow ? (parseFloat(pmtRow.total) || 0) : 0;

  let lastBilledMonth = r.last_billed_month;
  if (!lastBilledMonth) {
    await run(`UPDATE establishments SET last_billed_month = ? WHERE id = ?`, [activeMonthKey, r.id]).catch(() => {});
    r.last_billed_month = activeMonthKey;
    return r;
  }

  // The latest completed month that is now late/arrear (e.g. June for August collection)
  const lateLimitDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const lateLimitY = lateLimitDate.getFullYear();
  const lateLimitM = lateLimitDate.getMonth() + 1;

  const [lastY, lastM] = lastBilledMonth.split('-').map(Number);

  // Iterate months starting from lastBilledMonth + 1 up to lateLimit
  let iterY = lastY;
  let iterM = lastM + 1;
  if (iterM > 12) {
    iterM = 1;
    iterY += 1;
  }

  let newBalance = parseFloat(r.balance) || 0;
  let updatedLastBilledMonth = lastBilledMonth;

  while (iterY < lateLimitY || (iterY === lateLimitY && iterM <= lateLimitM)) {
    const iterMonthDate = new Date(iterY, iterM - 1, 1);
    const iterMonthName = iterMonthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' }); // e.g. "June 2026"
    
    // Check if a payment exists for this specific month
    const queryStr = `SELECT COUNT(*) as count FROM establishment_payments WHERE establishment_id = ? AND billing_period LIKE ?`;
    const checkPayment = await query(queryStr, [r.id, `%${iterMonthName}%`]);
    const paid = checkPayment[0].count > 0;

    if (!paid) {
      newBalance += parseFloat(r.monthly_fee);
    }
    
    updatedLastBilledMonth = `${iterY}-${String(iterM).padStart(2, '0')}`;

    // Move to next month
    iterM += 1;
    if (iterM > 12) {
      iterM = 1;
      iterY += 1;
    }
  }

  if (updatedLastBilledMonth !== lastBilledMonth) {
    await run(`UPDATE establishments SET balance = ?, last_billed_month = ? WHERE id = ?`, [
      newBalance, updatedLastBilledMonth, r.id
    ]).catch(() => {});
    r.balance = newBalance;
    r.last_billed_month = updatedLastBilledMonth;
  }

  return r;
};

// Establishments API
router.get('/establishments', async (req, res) => {
  try {
    const { route_id, q, status } = req.query;
    let sql = 'SELECT * FROM establishments WHERE 1=1';
    const params = [];
    if (route_id) {
      sql += ' AND route_id = ?';
      params.push(parseInt(route_id));
    }
    if (q) {
      sql += ' AND (name LIKE ? OR proprietor LIKE ? OR id LIKE ?)';
      const likeQuery = `%${q}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    const rows = await query(sql, params);
    const processedRows = await Promise.all(rows.map(processRowArrears));
    res.json(processedRows.map(r => ({
      id: r.id,
      name: r.name,
      proprietor: r.proprietor,
      phone: r.phone,
      monthlyFee: r.monthly_fee,
      penalty: r.penalty,
      previousBalance: r.balance,
      routeId: r.route_id,
      routeName: r.route_name,
      status: r.status || 'active',
      revisitDate: r.revisit_date,
      lastBilledMonth: r.last_billed_month,
      activePeriodPaid: r.active_period_paid || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/establishments', async (req, res) => {
  try {
    const est = req.body;
    let nextId = est.id;
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (!nextId) {
      const yy = String(today.getFullYear()).slice(2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const countRow = await query(`SELECT COUNT(*) as count FROM establishments`);
      const seq = String(countRow[0].count + 1).padStart(4, '0');
      nextId = `EST${yy}${mm}${dd}${seq}`;
    }

    const routesMap = {
      1: 'GANDHICHOWK',
      2: 'GATTAIAH CENTER',
      3: 'IT HUB TO SRI SRI CIRCLE',
      4: 'KAMAN BAZAR',
      5: 'KHANAPURAM',
      6: 'MUSTAFANAGAR',
      7: 'WYRA ROAD'
    };
    const routeName = routesMap[est.routeId] || 'GANDHICHOWK';

    await run(`INSERT INTO establishments (
      id, name, proprietor, phone, monthly_fee, penalty, balance, route_id, route_name, status, revisit_date, last_billed_month
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      nextId,
      est.name,
      est.proprietor || '',
      est.phone || '',
      parseFloat(est.monthlyFee) || 0,
      parseFloat(est.penalty) || 0,
      parseFloat(est.previousBalance) || 0,
      parseInt(est.routeId) || 1,
      routeName,
      est.status || 'pending',
      est.revisitDate || null,
      est.lastBilledMonth || currentMonthKey
    ]);

    res.json({
      id: nextId,
      name: est.name,
      proprietor: est.proprietor,
      phone: est.phone,
      monthlyFee: est.monthlyFee,
      penalty: est.penalty,
      previousBalance: est.previousBalance,
      routeId: est.routeId,
      routeName,
      status: est.status || 'pending',
      revisitDate: est.revisitDate || null,
      lastBilledMonth: est.lastBilledMonth || currentMonthKey
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/establishments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const est = req.body;

    const existing = await get(`SELECT * FROM establishments WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    const name = est.name !== undefined ? est.name : existing.name;
    const proprietor = est.proprietor !== undefined ? est.proprietor : existing.proprietor;
    const phone = est.phone !== undefined ? est.phone : existing.phone;
    const monthlyFee = est.monthlyFee !== undefined ? parseFloat(est.monthlyFee) : parseFloat(existing.monthly_fee);
    const penalty = est.penalty !== undefined ? parseFloat(est.penalty) : parseFloat(existing.penalty);
    const balance = est.previousBalance !== undefined ? parseFloat(est.previousBalance) : parseFloat(existing.balance);
    const routeId = est.routeId !== undefined ? parseInt(est.routeId) : parseInt(existing.route_id);
    const status = est.status !== undefined ? est.status : existing.status;
    const revisitDate = est.revisitDate !== undefined ? est.revisitDate : existing.revisit_date;
    const lastBilledMonth = est.lastBilledMonth !== undefined ? est.lastBilledMonth : existing.last_billed_month;

    const routesMap = {
      1: 'GANDHICHOWK',
      2: 'GATTAIAH CENTER',
      3: 'IT HUB TO SRI SRI CIRCLE',
      4: 'KAMAN BAZAR',
      5: 'KHANAPURAM',
      6: 'MUSTAFANAGAR',
      7: 'WYRA ROAD'
    };
    const routeName = routesMap[routeId] || 'GANDHICHOWK';

    await run(`UPDATE establishments SET 
      name = ?, proprietor = ?, phone = ?, monthly_fee = ?, penalty = ?, balance = ?, route_id = ?, route_name = ?, status = ?, revisit_date = ?, last_billed_month = ?
      WHERE id = ?`, [
      name,
      proprietor || '',
      phone || '',
      monthlyFee || 0,
      penalty || 0,
      balance || 0,
      routeId || 1,
      routeName,
      status || 'pending',
      revisitDate !== undefined ? revisitDate : null,
      lastBilledMonth || null,
      id
    ]);

    res.json({
      id,
      name,
      proprietor,
      phone,
      monthlyFee,
      penalty,
      previousBalance: balance,
      routeId,
      routeName,
      status,
      revisitDate,
      lastBilledMonth
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/establishments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM establishments WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/establishment-payments', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM establishment_payments ORDER BY date_time DESC`);
    res.json(rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      dateTime: r.date_time,
      establishmentId: r.establishment_id,
      establishmentName: r.establishment_name,
      amountPaid: r.amount_paid,
      paymentMode: r.payment_mode,
      remarks: r.remarks,
      collectorName: r.collector_name,
      collectorId: r.collector_id,
      billingPeriod: r.billing_period
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const normalizeEstablishmentId = (id) => {
  if (id && id.startsWith('GDC ')) {
    const num = parseInt(id.replace('GDC ', ''), 10);
    if (!isNaN(num)) {
      return `EST-R1-${String(num).padStart(4, '0')}`;
    }
  }
  return id;
};

router.post('/establishment-payments', async (req, res) => {
  try {
    const payment = req.body;
    const targetEstId = normalizeEstablishmentId(payment.establishmentId);
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `RVS${yy}${mm}${dd}`;

    const matches = await query(`SELECT COUNT(*) as count FROM establishment_payments WHERE receipt_no LIKE ?`, [`${datePrefix}%`]);
    const nextSeq = String(matches[0].count + 1).padStart(4, '0');
    const receiptNo = `${datePrefix}${nextSeq}`;

    const id = payment.id || receiptNo;
    const receiptNoFinal = payment.receiptNo || receiptNo;
    const dateTime = payment.dateTime || new Date().toISOString();

    const result = await run(`INSERT OR IGNORE INTO establishment_payments (
      id, receipt_no, date_time, establishment_id, establishment_name, amount_paid, payment_mode, remarks, collector_name, collector_id, billing_period
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, receiptNoFinal, dateTime, targetEstId, payment.establishmentName,
      parseFloat(payment.amountPaid) || 0, payment.paymentMode, payment.remarks,
      payment.collectorName || 'Srinivas', payment.collectorId || 'CE-0187',
      payment.billingPeriod || null
    ]);

    // Update establishment balance after payment (only if it was newly inserted in this request)
    if (result && result.changes > 0) {
      await run(`UPDATE establishments SET balance = MAX(0, balance - ?) WHERE id = ?`, [
        parseFloat(payment.amountPaid) || 0, targetEstId
      ]);
    }

    res.json({
      id,
      receiptNo: receiptNoFinal,
      dateTime,
      ...payment,
      establishmentId: targetEstId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/establishments/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = normalizeEstablishmentId(id);
    const rows = await query(`SELECT * FROM establishment_payments WHERE establishment_id = ? ORDER BY date_time DESC`, [targetId]);
    res.json(rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      dateTime: r.date_time,
      establishmentId: r.establishment_id,
      establishmentName: r.establishment_name,
      amountPaid: r.amount_paid,
      paymentMode: r.payment_mode,
      remarks: r.remarks,
      collectorName: r.collector_name,
      collectorId: r.collector_id,
      billingPeriod: r.billing_period
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users Management APIs
router.get('/users', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM users ORDER BY username ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, password, role, status } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    await run(`INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)`, 
      [username.trim().toLowerCase(), password, role || 'operator', status || 'active']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { password, status } = req.body;
    if (password !== undefined) {
      await run(`UPDATE users SET password = ? WHERE username = ?`, [password, username]);
    }
    if (status !== undefined) {
      await run(`UPDATE users SET status = ? WHERE username = ?`, [status, username]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Database Administration endpoint
router.post('/reset', async (req, res) => {
  try {
    await run(`DELETE FROM records`);
    await run(`DELETE FROM establishment_payments`);
    await run(`DELETE FROM establishments`);
    
    await initDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
