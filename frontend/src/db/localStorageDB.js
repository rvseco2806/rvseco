import { establishmentsData } from './establishments_data';
import { kmcDivisionsData, kmcVehiclesData, kmcDriversData } from './kmc_vehicles_data';

// Database Client for RVS Eco Projects supporting both Backend API and LocalStorage fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_RATES = {
  plastic: 16,
  cardboard: 10,
  glass: 3,
  others: 3,
  others_iron: 25,
  others_babybox: 3,
  others_blackplastic: 3
};

const DEFAULT_DIVISIONS = kmcDivisionsData;
const DEFAULT_VEHICLES = kmcVehiclesData;
const DEFAULT_DRIVERS = kmcDriversData;


const generateSeedRecords = () => {
  return [];
};

const generateSeedEstablishmentPayments = (establishments) => {
  return [];
};

class LocalStorageDB {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem('rvs_rates')) {
      localStorage.setItem('rvs_rates', JSON.stringify(DEFAULT_RATES));
    }

    const currentVehiclesVersion = localStorage.getItem('rvs_kmc_vehicles_strict_v7');
    if (!currentVehiclesVersion) {
      localStorage.setItem('rvs_divisions', JSON.stringify(kmcDivisionsData));
      localStorage.setItem('rvs_vehicles', JSON.stringify(kmcVehiclesData));
      localStorage.setItem('rvs_drivers', JSON.stringify(kmcDriversData));
      localStorage.setItem('rvs_kmc_vehicles_strict_v7', 'true');
    } else {
      if (!localStorage.getItem('rvs_divisions')) {
        localStorage.setItem('rvs_divisions', JSON.stringify(DEFAULT_DIVISIONS));
      }
      if (!localStorage.getItem('rvs_vehicles')) {
        localStorage.setItem('rvs_vehicles', JSON.stringify(DEFAULT_VEHICLES));
      }
      if (!localStorage.getItem('rvs_drivers')) {
        localStorage.setItem('rvs_drivers', JSON.stringify(DEFAULT_DRIVERS));
      }
    }
    if (!localStorage.getItem('rvs_records')) {
      const records = generateSeedRecords();
      localStorage.setItem('rvs_records', JSON.stringify(records));
    }
    let storedEsts = null;
    try {
      storedEsts = JSON.parse(localStorage.getItem('rvs_establishments'));
    } catch (e) {
      storedEsts = null;
    }
    if (!storedEsts || !Array.isArray(storedEsts) || storedEsts.length === 0) {
      localStorage.setItem('rvs_establishments', JSON.stringify(establishmentsData));
      storedEsts = establishmentsData;
    } else {
      // Migrate legacy IDs to standard format without losing other properties/balances
      let estsMigrated = false;
      const migratedEsts = storedEsts.map(e => {
        if (e.id && e.id.startsWith('GDC ')) {
          const num = parseInt(e.id.replace('GDC ', ''), 10);
          if (!isNaN(num)) {
            e.id = `EST-R1-${String(num).padStart(4, '0')}`;
            estsMigrated = true;
          }
        }
        return e;
      });
      if (estsMigrated) {
        localStorage.setItem('rvs_establishments', JSON.stringify(migratedEsts));
        storedEsts = migratedEsts;
      }
    }
    
    let storedPayments = null;
    try {
      storedPayments = JSON.parse(localStorage.getItem('rvs_establishment_payments'));
    } catch (e) {
      storedPayments = null;
    }
    if (!storedPayments || !Array.isArray(storedPayments)) {
      const pms = generateSeedEstablishmentPayments(establishmentsData);
      localStorage.setItem('rvs_establishment_payments', JSON.stringify(pms));
    } else {
      // Migrate any legacy GDC IDs in local payment records
      let paymentMigrated = false;
      const migratedPayments = storedPayments.map(p => {
        if (p.establishmentId && p.establishmentId.startsWith('GDC ')) {
          const num = parseInt(p.establishmentId.replace('GDC ', ''), 10);
          if (!isNaN(num)) {
            p.establishmentId = `EST-R1-${String(num).padStart(4, '0')}`;
            paymentMigrated = true;
          }
        }
        return p;
      });
      if (paymentMigrated) {
        localStorage.setItem('rvs_establishment_payments', JSON.stringify(migratedPayments));
      }
    }
    if (!localStorage.getItem('rvs_users')) {
      localStorage.setItem('rvs_users', JSON.stringify([
        { username: 'admin_drcc', password: 'admin123', role: 'admin_drcc', status: 'active' },
        { username: 'admin_est', password: 'admin123', role: 'admin_est', status: 'active' },
        { username: 'operator_drcc', password: 'operator123', role: 'operator_drcc', status: 'active' },
        { username: 'operator_est', password: 'operator123', role: 'operator_est', status: 'active' }
      ]));
    }
  }

  getRates() {
    const rates = JSON.parse(localStorage.getItem('rvs_rates')) || {};
    return { ...DEFAULT_RATES, ...rates };
  }

  updateRates(rates) {
    localStorage.setItem('rvs_rates', JSON.stringify(rates));
    return rates;
  }

  getDivisions() {
    return JSON.parse(localStorage.getItem('rvs_divisions'));
  }

  addDivision(division) {
    const list = this.getDivisions();
    const newId = String(Math.max(...list.map(d => parseInt(d.id) || 0)) + 1);
    const newDiv = { id: newId, name: division.name, vehicles: 0, activeVehicles: 0 };
    list.push(newDiv);
    localStorage.setItem('rvs_divisions', JSON.stringify(list));
    return newDiv;
  }

  deleteDivision(id) {
    let list = this.getDivisions();
    list = list.filter(d => d.id !== id);
    localStorage.setItem('rvs_divisions', JSON.stringify(list));
    return true;
  }

  getVehicles() {
    return JSON.parse(localStorage.getItem('rvs_vehicles'));
  }

  addVehicle(vehicle) {
    const list = this.getVehicles();
    list.push(vehicle);
    localStorage.setItem('rvs_vehicles', JSON.stringify(list));
    this.updateDivisionStats();
    return vehicle;
  }

  deleteVehicle(number) {
    let list = this.getVehicles();
    list = list.filter(v => v.number !== number);
    localStorage.setItem('rvs_vehicles', JSON.stringify(list));
    this.updateDivisionStats();
    return true;
  }

  getDrivers() {
    return JSON.parse(localStorage.getItem('rvs_drivers'));
  }

  addDriver(driver) {
    const list = this.getDrivers();
    list.push(driver);
    localStorage.setItem('rvs_drivers', JSON.stringify(list));
    return driver;
  }

  deleteDriver(name) {
    let list = this.getDrivers();
    list = list.filter(d => d.name !== name);
    localStorage.setItem('rvs_drivers', JSON.stringify(list));
    return true;
  }

  getRecords() {
    return JSON.parse(localStorage.getItem('rvs_records')) || [];
  }

  addRecord(record) {
    const list = this.getRecords();
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `DRCC${dd}${mm}${yy}`;
    
    const todayRecords = list.filter(r => r.receiptNo && r.receiptNo.startsWith(datePrefix));
    const nextSeq = String(todayRecords.length + 1).padStart(4, '0');
    const receiptNo = `${datePrefix}${nextSeq}`;

    const newRecord = {
      id: receiptNo,
      receiptNo: receiptNo,
      dateTime: new Date().toISOString(),
      status: 'Completed',
      ...record
    };

    list.unshift(newRecord);
    localStorage.setItem('rvs_records', JSON.stringify(list));
    return newRecord;
  }

  deleteRecord(id) {
    let list = this.getRecords();
    list = list.filter(r => r.id !== id);
    localStorage.setItem('rvs_records', JSON.stringify(list));
    const syncedIds = JSON.parse(localStorage.getItem('rvs_synced_record_ids')) || [];
    const updatedSync = syncedIds.filter(x => x !== id);
    localStorage.setItem('rvs_synced_record_ids', JSON.stringify(updatedSync));
    return true;
  }

  updateDivisionStats() {
    const divisions = this.getDivisions();
    const vehicles = this.getVehicles();
    const updated = divisions.map((div) => {
      const vCount = vehicles.filter(v => String(v.division) === String(div.id)).length;
      return {
        ...div,
        vehicles: vCount,
        activeVehicles: vCount
      };
    });
    localStorage.setItem('rvs_divisions', JSON.stringify(updated));
  }


  processEstablishmentArrears(list) {
    const today = new Date();
    const currentY = today.getFullYear();
    const currentM = today.getMonth() + 1;
    const currentMonthKey = `${currentY}-${String(currentM).padStart(2, '0')}`;
    let modified = false;

    const updatedList = list.map(est => {
      if (!est || est.status === 'inactive' || !est.monthlyFee || est.monthlyFee <= 0) {
        return est;
      }
      let lastBilledMonth = est.lastBilledMonth;
      if (!lastBilledMonth) {
        modified = true;
        return {
          ...est,
          lastBilledMonth: currentMonthKey
        };
      }

      const [lastY, lastM] = lastBilledMonth.split('-').map(Number);
      const missedMonths = (currentY - lastY) * 12 + (currentM - lastM);

      if (missedMonths > 0) {
        modified = true;
        const additionalArrears = missedMonths * (parseFloat(est.monthlyFee) || 0);
        return {
          ...est,
          previousBalance: (parseFloat(est.previousBalance) || 0) + additionalArrears,
          lastBilledMonth: currentMonthKey
        };
      }

      return est;
    });

    if (modified) {
      localStorage.setItem('rvs_establishments', JSON.stringify(updatedList));
    }
    return updatedList;
  }

  getEstablishments(routeId, query, status) {
    let list = JSON.parse(localStorage.getItem('rvs_establishments'));
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = establishmentsData;
      localStorage.setItem('rvs_establishments', JSON.stringify(list));
    }
    list = this.processEstablishmentArrears(list);
    let filtered = list;
    if (status) {
      filtered = filtered.filter(e => (e.status || 'active') === status);
    }
    if (routeId && routeId !== 'All') {
      filtered = filtered.filter(e => parseInt(e.routeId) === parseInt(routeId));
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(e => 
        (e.name && e.name.toLowerCase().includes(q)) || 
        (e.proprietor && e.proprietor.toLowerCase().includes(q)) ||
        (e.id && e.id.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q))
      );
    }
    return filtered;
  }

  addEstablishmentPayment(payment) {
    const list = JSON.parse(localStorage.getItem('rvs_establishment_payments')) || [];
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `RVS${yy}${mm}${dd}`;

    const todayPayments = list.filter(p => p.receiptNo && p.receiptNo.startsWith(datePrefix));
    const nextSeq = String(todayPayments.length + 1).padStart(4, '0');
    const receiptNo = `${datePrefix}${nextSeq}`;

    const newPayment = {
      id: receiptNo,
      receiptNo: receiptNo,
      dateTime: new Date().toISOString(),
      ...payment
    };

    list.unshift(newPayment);
    localStorage.setItem('rvs_establishment_payments', JSON.stringify(list));

    // Update establishment balance in LocalStorage
    const estList = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const updatedEstList = estList.map(e => {
      if (e.id === payment.establishmentId) {
        return {
          ...e,
          previousBalance: Math.max(0, e.previousBalance - (parseFloat(payment.amountPaid) || 0))
        };
      }
      return e;
    });
    localStorage.setItem('rvs_establishments', JSON.stringify(updatedEstList));

    return newPayment;
  }

  getEstablishmentPayments(estId) {
    const list = JSON.parse(localStorage.getItem('rvs_establishment_payments')) || [];
    return list.filter(p => p.establishmentId === estId);
  }

  getEstablishmentPaymentsAll() {
    return JSON.parse(localStorage.getItem('rvs_establishment_payments')) || [];
  }

  deleteEstablishmentPayment(id) {
    let payments = this.getEstablishmentPaymentsAll();
    const pmt = payments.find(p => p.id === id);
    if (!pmt) return false;
    
    payments = payments.filter(p => p.id !== id);
    localStorage.setItem('rvs_establishment_payments', JSON.stringify(payments));
    
    const estList = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const updatedEstList = estList.map(e => {
      if (e.id === pmt.establishmentId) {
        return {
          ...e,
          previousBalance: (e.previousBalance || 0) + (parseFloat(pmt.amountPaid) || 0)
        };
      }
      return e;
    });
    localStorage.setItem('rvs_establishments', JSON.stringify(updatedEstList));

    const syncedIds = JSON.parse(localStorage.getItem('rvs_synced_payment_ids')) || [];
    const updatedSync = syncedIds.filter(x => x !== id);
    localStorage.setItem('rvs_synced_payment_ids', JSON.stringify(updatedSync));
    return true;
  }

  addEstablishment(est) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const seq = String(list.length + 1).padStart(4, '0');
    const nextId = est.id || `EST${yy}${mm}${dd}${seq}`;

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

    const newEst = {
      id: nextId,
      name: est.name,
      proprietor: est.proprietor || '',
      phone: est.phone || '',
      monthlyFee: parseFloat(est.monthlyFee) || 0,
      penalty: parseFloat(est.penalty) || 0,
      previousBalance: parseFloat(est.previousBalance) || 0,
      routeId: parseInt(est.routeId) || 1,
      routeName: routeName,
      status: est.status || 'pending',
      revisitDate: est.revisitDate || null
    };

    list.push(newEst);
    localStorage.setItem('rvs_establishments', JSON.stringify(list));
    return newEst;
  }

  updateEstablishment(id, data) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const routesMap = {
      1: 'GANDHICHOWK',
      2: 'GATTAIAH CENTER',
      3: 'IT HUB TO SRI SRI CIRCLE',
      4: 'KAMAN BAZAR',
      5: 'KHANAPURAM',
      6: 'MUSTAFANAGAR',
      7: 'WYRA ROAD'
    };
    const routeName = routesMap[data.routeId] || 'GANDHICHOWK';

    const updated = list.map(e => {
      if (e.id === id) {
        return {
          ...e,
          name: data.name,
          proprietor: data.proprietor,
          phone: data.phone,
          monthlyFee: parseFloat(data.monthlyFee) || 0,
          penalty: parseFloat(data.penalty) || 0,
          previousBalance: parseFloat(data.previousBalance) || 0,
          routeId: parseInt(data.routeId) || 1,
          routeName: routeName,
          status: data.status || e.status || 'active',
          revisitDate: data.revisitDate !== undefined ? data.revisitDate : e.revisitDate || null
        };
      }
      return e;
    });

    localStorage.setItem('rvs_establishments', JSON.stringify(updated));
    return updated.find(e => e.id === id);
  }

  /** Approve a pending establishment: sets status to 'active' */
  approveEstablishment(id) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const updated = list.map(e => e.id === id ? { ...e, status: 'active' } : e);
    localStorage.setItem('rvs_establishments', JSON.stringify(updated));
    return updated.find(e => e.id === id);
  }

  /** Reject/delete a pending establishment */
  rejectEstablishment(id) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const filtered = list.filter(e => e.id !== id);
    localStorage.setItem('rvs_establishments', JSON.stringify(filtered));
    return true;
  }

  /** Delete an establishment by ID */
  deleteEstablishment(id) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const filtered = list.filter(e => e.id !== id);
    localStorage.setItem('rvs_establishments', JSON.stringify(filtered));
    return true;
  }

  /** Apply an additional penalty amount to an establishment */
  applyPenalty(id, penaltyAmount, remarks) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const updated = list.map(e => {
      if (e.id === id) {
        return { ...e, penalty: (parseFloat(e.penalty) || 0) + (parseFloat(penaltyAmount) || 0) };
      }
      return e;
    });
    localStorage.setItem('rvs_establishments', JSON.stringify(updated));
    // Log it
    const penaltyLogs = JSON.parse(localStorage.getItem('rvs_penalty_logs')) || [];
    penaltyLogs.unshift({ id, penaltyAmount, remarks, dateTime: new Date().toISOString() });
    localStorage.setItem('rvs_penalty_logs', JSON.stringify(penaltyLogs));
    return updated.find(e => e.id === id);
  }

  /** Update only the monthly fee of an establishment */
  updateEstablishmentFee(id, newFee) {
    const list = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
    const updated = list.map(e =>
      e.id === id ? { ...e, monthlyFee: parseFloat(newFee) || 0 } : e
    );
    localStorage.setItem('rvs_establishments', JSON.stringify(updated));
    return updated.find(e => e.id === id);
  }

  getUsers() {
    return JSON.parse(localStorage.getItem('rvs_users')) || [];
  }

  addUser(user) {
    const list = this.getUsers();
    if (list.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      throw new Error('User already exists');
    }
    const newUser = {
      username: user.username.trim().toLowerCase(),
      password: user.password,
      role: user.role || 'operator',
      status: user.status || 'active'
    };
    list.push(newUser);
    localStorage.setItem('rvs_users', JSON.stringify(list));
    return newUser;
  }

  updateUser(username, data) {
    let list = this.getUsers();
    list = list.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return {
          ...u,
          ...data
        };
      }
      return u;
    });
    localStorage.setItem('rvs_users', JSON.stringify(list));
    return true;
  }

  resetDB() {
    localStorage.removeItem('rvs_rates');
    localStorage.removeItem('rvs_divisions');
    localStorage.removeItem('rvs_vehicles');
    localStorage.removeItem('rvs_drivers');
    localStorage.removeItem('rvs_records');
    localStorage.removeItem('rvs_establishments');
    localStorage.removeItem('rvs_establishment_payments');
    localStorage.removeItem('rvs_users');
    this.init();
    return true;
  }
}

const localBackup = new LocalStorageDB();

class BackendAPIClient {
  constructor() {
    this.useFallback = false;
    this.isSyncing = false;
    this.lastSyncTime = 0;
  }

  async syncOfflineData() {
    try {
      // 1. Sync DRCC records
      const offlineRecords = localBackup.getRecords();
      if (offlineRecords.length > 0) {
        const syncedRecordIds = JSON.parse(localStorage.getItem('rvs_synced_record_ids')) || [];
        for (const record of offlineRecords) {
          if (!syncedRecordIds.includes(record.id)) {
            try {
              const res = await fetch(`${API_URL}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
              });
              if (res.ok) {
                syncedRecordIds.push(record.id);
              }
            } catch (e) {
              console.error("Failed to sync record:", record.id, e);
            }
          }
        }
        localStorage.setItem('rvs_synced_record_ids', JSON.stringify(syncedRecordIds));
      }

      // 2. Sync Establishment payments
      const offlinePayments = localBackup.getEstablishmentPaymentsAll();
      if (offlinePayments.length > 0) {
        const syncedPaymentIds = JSON.parse(localStorage.getItem('rvs_synced_payment_ids')) || [];
        for (const payment of offlinePayments) {
          if (!syncedPaymentIds.includes(payment.id)) {
            try {
              const res = await fetch(`${API_URL}/establishment-payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payment)
              });
              if (res.ok) {
                syncedPaymentIds.push(payment.id);
              }
            } catch (e) {
              console.error("Failed to sync payment:", payment.id, e);
            }
          }
        }
        localStorage.setItem('rvs_synced_payment_ids', JSON.stringify(syncedPaymentIds));
      }
    } catch (e) {
      console.error("Offline sync failed:", e);
    }
  }

  async checkBackend() {
    try {
      const res = await fetch(`${API_URL}/rates`, { method: 'HEAD' });
      const online = res.ok;
      this.useFallback = !online;
      if (online && !this.isSyncing && Date.now() - this.lastSyncTime > 15000) {
        this.isSyncing = true;
        this.syncOfflineData().finally(() => {
          this.isSyncing = false;
          this.lastSyncTime = Date.now();
        });
      }
    } catch (err) {
      this.useFallback = true;
    }
  }

  async getRates() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getRates();
    try {
      const res = await fetch(`${API_URL}/rates`);
      return await res.json();
    } catch (e) {
      return localBackup.getRates();
    }
  }

  async updateRates(rates) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.updateRates(rates);
    try {
      const res = await fetch(`${API_URL}/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates)
      });
      return await res.json();
    } catch (e) {
      return localBackup.updateRates(rates);
    }
  }

  async getDivisions() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getDivisions();
    try {
      const res = await fetch(`${API_URL}/divisions`);
      return await res.json();
    } catch (e) {
      return localBackup.getDivisions();
    }
  }

  async addDivision(division) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addDivision(division);
    try {
      const res = await fetch(`${API_URL}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(division)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addDivision(division);
    }
  }

  async deleteDivision(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteDivision(id);
    try {
      const res = await fetch(`${API_URL}/divisions/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return localBackup.deleteDivision(id);
    }
  }

  async getVehicles() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getVehicles();
    try {
      const res = await fetch(`${API_URL}/vehicles`);
      return await res.json();
    } catch (e) {
      return localBackup.getVehicles();
    }
  }

  async addVehicle(vehicle) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addVehicle(vehicle);
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addVehicle(vehicle);
    }
  }

  async deleteVehicle(number) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteVehicle(number);
    try {
      const res = await fetch(`${API_URL}/vehicles/${number}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return localBackup.deleteVehicle(number);
    }
  }

  async getDrivers() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getDrivers();
    try {
      const res = await fetch(`${API_URL}/drivers`);
      return await res.json();
    } catch (e) {
      return localBackup.getDrivers();
    }
  }

  async addDriver(driver) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addDriver(driver);
    try {
      const res = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addDriver(driver);
    }
  }

  async deleteDriver(name) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteDriver(name);
    try {
      const res = await fetch(`${API_URL}/drivers/${name}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return localBackup.deleteDriver(name);
    }
  }

  async getRecords() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getRecords();
    try {
      const res = await fetch(`${API_URL}/records`);
      return await res.json();
    } catch (e) {
      return localBackup.getRecords();
    }
  }

  async addRecord(record) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addRecord(record);
    try {
      const res = await fetch(`${API_URL}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addRecord(record);
    }
  }

  async deleteRecord(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteRecord(id);
    try {
      const res = await fetch(`${API_URL}/records/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return localBackup.deleteRecord(id);
    }
  }

  async getEstablishments(routeId, query, status) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getEstablishments(routeId, query, status);
    try {
      let url = `${API_URL}/establishments`;
      const params = [];
      if (routeId && routeId !== 'All') params.push(`route_id=${routeId}`);
      if (query) params.push(`q=${encodeURIComponent(query)}`);
      if (status) params.push(`status=${status}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Sync local storage cache with fetched backend data
        const estList = JSON.parse(localStorage.getItem('rvs_establishments')) || [];
        const updatedEstList = estList.map(localEst => {
          const freshEst = data.find(d => d.id === localEst.id);
          if (freshEst) {
            return {
              ...localEst,
              previousBalance: freshEst.previousBalance,
              penalty: freshEst.penalty,
              status: freshEst.status,
              activePeriodPaid: freshEst.activePeriodPaid
            };
          }
          return localEst;
        });
        localStorage.setItem('rvs_establishments', JSON.stringify(updatedEstList));
        return data;
      }
      return localBackup.getEstablishments(routeId, query, status);
    } catch (e) {
      return localBackup.getEstablishments(routeId, query, status);
    }
  }

  async addEstablishmentPayment(payment) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addEstablishmentPayment(payment);
    try {
      const res = await fetch(`${API_URL}/establishment-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addEstablishmentPayment(payment);
    }
  }

  async getEstablishmentPayments(estId) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getEstablishmentPayments(estId);
    try {
      const res = await fetch(`${API_URL}/establishments/${estId}/payments`);
      return await res.json();
    } catch (e) {
      return localBackup.getEstablishmentPayments(estId);
    }
  }

  async getEstablishmentPaymentsAll() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getEstablishmentPaymentsAll();
    try {
      const res = await fetch(`${API_URL}/establishment-payments`);
      return await res.json();
    } catch (e) {
      return localBackup.getEstablishmentPaymentsAll();
    }
  }

  async deleteEstablishmentPayment(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteEstablishmentPayment(id);
    try {
      const res = await fetch(`${API_URL}/establishment-payments/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return localBackup.deleteEstablishmentPayment(id);
    }
  }

  async addEstablishment(est) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addEstablishment(est);
    try {
      const res = await fetch(`${API_URL}/establishments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(est)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addEstablishment(est);
    }
  }

  async updateEstablishment(id, data) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.updateEstablishment(id, data);
    try {
      const res = await fetch(`${API_URL}/establishments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      return localBackup.updateEstablishment(id, data);
    }
  }

  async approveEstablishment(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.approveEstablishment(id);
    try {
      return await this.updateEstablishment(id, { status: 'active' });
    } catch (e) {
      return localBackup.approveEstablishment(id);
    }
  }

  async rejectEstablishment(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.rejectEstablishment(id);
    try {
      return await this.deleteEstablishment(id);
    } catch (e) {
      return localBackup.rejectEstablishment(id);
    }
  }

  async deleteEstablishment(id) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.deleteEstablishment(id);
    try {
      const res = await fetch(`${API_URL}/establishments/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return localBackup.deleteEstablishment(id);
    }
  }

  async applyPenalty(id, penaltyAmount, remarks) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.applyPenalty(id, penaltyAmount, remarks);
    try {
      // Fetch the current establishments list to find current penalty
      const resEst = await fetch(`${API_URL}/establishments`);
      const ests = await resEst.json();
      const currentEst = ests.find(e => e.id === id);
      const currentPenalty = currentEst ? (parseFloat(currentEst.penalty) || 0) : 0;
      const newPenalty = currentPenalty + (parseFloat(penaltyAmount) || 0);
      return await this.updateEstablishment(id, { penalty: newPenalty });
    } catch (e) {
      return localBackup.applyPenalty(id, penaltyAmount, remarks);
    }
  }

  async updateEstablishmentFee(id, newFee) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.updateEstablishmentFee(id, newFee);
    try {
      return await this.updateEstablishment(id, { monthlyFee: parseFloat(newFee) || 0 });
    } catch (e) {
      return localBackup.updateEstablishmentFee(id, newFee);
    }
  }

  async getUsers() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getUsers();
    try {
      const res = await fetch(`${API_URL}/users`);
      return await res.json();
    } catch (e) {
      return localBackup.getUsers();
    }
  }

  async addUser(user) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.addUser(user);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return await res.json();
    } catch (e) {
      return localBackup.addUser(user);
    }
  }

  async updateUser(username, data) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.updateUser(username, data);
    try {
      const res = await fetch(`${API_URL}/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      return localBackup.updateUser(username, data);
    }
  }

  async resetDB() {
    await this.checkBackend();
    if (this.useFallback) return localBackup.resetDB();
    try {
      const res = await fetch(`${API_URL}/reset`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      return localBackup.resetDB();
    }
  }
}

export const db = new BackendAPIClient();
