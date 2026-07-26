function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round(number(value) * 100) / 100;
}

function generateFeeStructure(courseName) {
  const baseTuition = courseName && courseName.toLowerCase() === 'mca' ? 25000 : 16880;
  const heads = [
    ['Admission Fee (Non Refundable)', 30000, '01-08-2025'],
    ['University Reg. Fees', 2100, '30-08-2025'],
    ['1st Sem Tuition Fees - 1st Installment', 12130, '30-08-2025'],
    ['1st Sem Tuition Fees - 2nd Installment', 10530, '30-11-2025'],
    ['Examination Fees (Sem 1)', 3700, '30-11-2025'],
    ['2nd Sem Tuition Fees - 1st Installment', baseTuition, '15-02-2026'],
    ['2nd Sem Tuition Fees - 2nd Installment', baseTuition, '20-05-2026'],
    ['Examination Fees (Sem 2)', 3700, '20-05-2026'],
    ['3rd Sem Tuition Fees - 1st Installment', baseTuition, '01-09-2026'],
    ['3rd Sem Tuition Fees - 2nd Installment', baseTuition, '01-12-2026'],
    ['Examination Fees (Sem 3)', 3700, '01-12-2026'],
    ['4th Sem Tuition Fees - 1st Installment', baseTuition, '15-02-2027'],
    ['4th Sem Tuition Fees - 2nd Installment', baseTuition, '20-05-2027'],
    ['Examination Fees (Sem 4)', 3700, '20-05-2027'],
    ['5th Sem Tuition Fees - 1st Installment', baseTuition, '01-09-2027'],
    ['5th Sem Tuition Fees - 2nd Installment', baseTuition, '01-12-2027'],
    ['Examination Fees (Sem 5)', 3700, '01-12-2027'],
    ['6th Sem Tuition Fees - 1st Installment', baseTuition, '15-02-2028'],
    ['Provisional Certificate Fees', 500, '20-05-2028'],
    ['6th Sem Tuition Fees - 2nd Installment', baseTuition, '20-05-2028'],
    ['Examination Fees (Sem 6)', 3700, '20-05-2028']
  ].map(([headName, amount, dueDate]) => ({
    headName,
    dueDate,
    amount: roundMoney(amount),
    discount: 0,
    fine: 0,
    paid: 0,
    due: roundMoney(amount),
    status: 'Due'
  }));

  const total = heads.reduce((sum, h) => sum + h.amount, 0);
  return { feeHeads: heads, totalAmount: total, totalDue: total, totalPaid: 0, totalDiscount: 0 };
}

function applyPaymentToHeads(feeRecord, amount, preferredHeadId) {
  let remaining = roundMoney(amount);
  if (remaining <= 0) throw Object.assign(new Error('Payment amount must be greater than zero.'), { statusCode: 400 });

  const heads = preferredHeadId
    ? feeRecord.feeHeads.filter(h => h._id.toString() === preferredHeadId)
    : feeRecord.feeHeads;

  if (!heads.length) throw Object.assign(new Error('Fee head not found.'), { statusCode: 400 });

  const totalDueBefore = feeRecord.feeHeads.reduce((sum, h) => sum + Math.max(0, number(h.due)), 0);
  if (remaining > totalDueBefore) {
    throw Object.assign(new Error(`Payment cannot exceed pending due ₹${totalDueBefore}.`), { statusCode: 400 });
  }

  for (const head of heads) {
    if (remaining <= 0) break;
    const payable = Math.max(0, number(head.due));
    const paidNow = Math.min(payable, remaining);
    head.paid = roundMoney(number(head.paid) + paidNow);
    head.due = roundMoney(payable - paidNow);
    head.status = head.due <= 0 ? 'Paid' : head.paid > 0 ? 'Partial' : 'Due';
    remaining = roundMoney(remaining - paidNow);
  }

  if (remaining > 0 && preferredHeadId) {
    return applyPaymentToHeads(feeRecord, remaining, null);
  }

  recalcFeeTotals(feeRecord);
}

function recalcFeeTotals(feeRecord) {
  feeRecord.totalAmount = roundMoney(feeRecord.feeHeads.reduce((sum, h) => sum + number(h.amount) + number(h.fine), 0));
  feeRecord.totalDiscount = roundMoney(feeRecord.feeHeads.reduce((sum, h) => sum + number(h.discount), 0));
  feeRecord.totalPaid = roundMoney(feeRecord.feeHeads.reduce((sum, h) => sum + number(h.paid), 0));
  feeRecord.totalDue = roundMoney(Math.max(0, feeRecord.totalAmount - feeRecord.totalDiscount - feeRecord.totalPaid));
}

function receiptNo(prefix = 'REC') {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

module.exports = { generateFeeStructure, applyPaymentToHeads, recalcFeeTotals, receiptNo, roundMoney, number };
