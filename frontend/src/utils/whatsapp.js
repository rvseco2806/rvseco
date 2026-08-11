/**
 * WhatsApp Receipt and Notice Utility for RVS ECO PROJECTS
 */

export const getBillingPeriod = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const formatDate = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const monthName = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    monthName,
    periodStr: `${formatDate(firstDay)} to ${formatDate(lastDay)} (${monthName})`
  };
};

export const generateBillingPeriodOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = getBillingPeriod(d);
    options.push(period);
  }
  return options;
};

export const sendWhatsAppReceipt = (receipt, establishment) => {
  if (!receipt) return;
  
  const phone = (establishment?.phone || receipt?.phone || '').replace(/\D/g, '');
  const estName = establishment?.name || receipt?.establishmentName || 'Establishment';
  const estId = establishment?.id || receipt?.establishmentId || 'N/A';
  const proprietor = establishment?.proprietor || receipt?.proprietor || 'Valued Customer';
  const routeName = establishment?.routeName || receipt?.routeName || 'N/A';
  
  const monthlyFee = parseFloat(establishment?.monthlyFee || receipt?.monthlyFee || 0).toFixed(2);
  const penalty = parseFloat(establishment?.penalty || receipt?.penalty || 0).toFixed(2);
  const prevBal = parseFloat(establishment?.previousBalance || receipt?.previousBalance || 0).toFixed(2);
  const totalPayable = (parseFloat(monthlyFee) + parseFloat(penalty) + parseFloat(prevBal)).toFixed(2);
  const amtPaid = parseFloat(receipt?.amountPaid || 0).toFixed(2);
  const outstanding = Math.max(0, parseFloat(totalPayable) - parseFloat(amtPaid)).toFixed(2);
  
  const dateObj = receipt?.dateTime ? new Date(receipt.dateTime) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN');
  const monthYear = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const billingPeriodStr = receipt?.billingPeriod || getBillingPeriod(dateObj).periodStr;

  const message = 
`🧾 *RVS ECO PROJECTS - COMMERCIAL USER FEE RECEIPT*
------------------------------------------------
🏛️ *Khammam Municipal Corporation*
📄 *Receipt No:* ${receipt?.receiptNo || 'RVS' + Date.now()}
📅 *Date:* ${dateStr} (${monthYear})
🗓️ *Billing Period:* ${billingPeriodStr}

🏪 *Shop Name:* ${estName}
🆔 *Shop ID:* ${estId}
👤 *Proprietor:* ${proprietor}
📍 *Route:* ${routeName}

------------------------------------------------
💰 *Monthly Fee:* ₹${monthlyFee}
⚠️ *Penalty:* ₹${penalty}
📋 *Previous Arrears:* ₹${prevBal}
------------------------------------------------
💵 *Total Demand:* ₹${totalPayable}
✅ *Amount Paid:* ₹${amtPaid}
🔴 *Outstanding Balance:* ₹${outstanding}
💳 *Payment Mode:* ${receipt?.paymentMode || 'Cash'}
👤 *Collector:* ${receipt?.collectorName || 'Srinivas'} (${receipt?.collectorId || 'CE-0187'})

Thank you for keeping Khammam Clean & Green! 🌱`;

  const encodedMsg = encodeURIComponent(message);
  const cleanPhone = phone ? (phone.length === 10 ? `91${phone}` : phone) : '';
  const url = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  window.open(url, '_blank');
};

export const sendWhatsAppDemandNotice = (establishment, customBillingPeriod) => {
  if (!establishment) return;

  const phone = (establishment?.phone || '').replace(/\D/g, '');
  const estName = establishment?.name || 'Establishment';
  const estId = establishment?.id || 'N/A';
  const proprietor = establishment?.proprietor || 'Valued Customer';
  const routeName = establishment?.routeName || 'N/A';
  
  const monthlyFee = parseFloat(establishment?.monthlyFee || 0).toFixed(2);
  const penalty = parseFloat(establishment?.penalty || 0).toFixed(2);
  const prevBal = parseFloat(establishment?.previousBalance || 0).toFixed(2);
  const totalPayable = (parseFloat(monthlyFee) + parseFloat(penalty) + parseFloat(prevBal)).toFixed(2);
  
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN');
  const billingPeriodStr = customBillingPeriod || getBillingPeriod(dateObj).periodStr;

  const message = 
`📋 *RVS ECO PROJECTS - COMMERCIAL USER FEE NOTICE*
------------------------------------------------
🏛️ *Khammam Municipal Corporation*
📄 *Notice Date:* ${dateStr}
🗓️ *Billing Period:* ${billingPeriodStr}

🏪 *Shop Name:* ${estName}
🆔 *Shop ID:* ${estId}
👤 *Proprietor:* ${proprietor}
📍 *Route:* ${routeName}

------------------------------------------------
💰 *Monthly User Fee:* ₹${monthlyFee}
⚠️ *Penalty Amount:* ₹${penalty}
📋 *Pending Arrears:* ₹${prevBal}
------------------------------------------------
🔴 *TOTAL AMOUNT DUE:* ₹${totalPayable}

Kindly clear your commercial garbage collection user fee at the earliest to support municipal cleanliness drives.

Thank you for your cooperation! 🌱`;

  const encodedMsg = encodeURIComponent(message);
  const cleanPhone = phone ? (phone.length === 10 ? `91${phone}` : phone) : '';
  const url = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  window.open(url, '_blank');
};
