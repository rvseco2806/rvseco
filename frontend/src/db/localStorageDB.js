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
  const payments = [];
  const paymentModes = ['UPI', 'Cash', 'Card'];
  const collectors = [
    { name: 'operator_est', id: 'OP_EST_01' },
    { name: 'Suresh', id: 'OP_EST_02' },
    { name: 'Ramesh', id: 'OP_EST_03' }
  ];

  const activeEsts = establishments.filter(e => e.monthlyFee > 0).slice(0, 150);

  for (let day = 19; day <= 26; day++) {
    const dateStr = `2026-06-${day}`;
    const count = 8 + (day % 8);
    for (let i = 1; i <= count; i++) {
      const est = activeEsts[(day * 7 + i) % activeEsts.length];
      if (!est) continue;
      const collector = collectors[(day + i) % collectors.length];
      const mode = paymentModes[(day * 3 + i) % paymentModes.length];
      const receiptNo = `RVS2606${day}${String(i).padStart(4, '0')}`;
      const hour = 9 + (i % 8);
      const minute = (i * 12) % 60;
      
      payments.push({
        id: receiptNo,
        receiptNo: receiptNo,
        dateTime: `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
        establishmentId: est.id,
        establishmentName: est.name,
        amountPaid: est.monthlyFee,
        paymentMode: mode,
        remarks: 'Monthly User Fee',
        collectorName: collector.name,
        collectorId: collector.id
      });
    }
  }
  return payments;
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
    const storedEsts = JSON.parse(localStorage.getItem('rvs_establishments'));
    if (!storedEsts || !Array.isArray(storedEsts) || storedEsts.length === 0) {
      localStorage.setItem('rvs_establishments', JSON.stringify(establishmentsData));
    }
    if (!localStorage.getItem('rvs_establishment_payments')) {
      const pms = generateSeedEstablishmentPayments(establishmentsData);
      localStorage.setItem('rvs_establishment_payments', JSON.stringify(pms));
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

  getEstablishments(routeId, query) {
    let list = JSON.parse(localStorage.getItem('rvs_establishments'));
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = establishmentsData;
      localStorage.setItem('rvs_establishments', JSON.stringify(list));
    }
    list = this.processEstablishmentArrears(list);
    let filtered = list;
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
      status: est.status || 'active',
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
  }

  async checkBackend() {
    try {
      const res = await fetch(`${API_URL}/rates`, { method: 'HEAD' });
      // If server is not running or returns non-2xx status, fallback to localStorage
      this.useFallback = !res.ok;
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

  async getEstablishments(routeId, query) {
    await this.checkBackend();
    if (this.useFallback) return localBackup.getEstablishments(routeId, query);
    try {
      let url = `${API_URL}/establishments`;
      const params = [];
      if (routeId && routeId !== 'All') params.push(`route_id=${routeId}`);
      if (query) params.push(`q=${encodeURIComponent(query)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return localBackup.getEstablishments(routeId, query);
    } catch (e) {
      return localBackup.getEstablishments(routeId, query);
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
