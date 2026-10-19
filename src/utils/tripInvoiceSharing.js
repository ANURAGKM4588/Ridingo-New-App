/**
 * Universal Free Trip Invoice Generator & Auto-Sharing Service
 * 
 * Supports:
 * - Detailed itemized invoice breakdown (Base Fare, Additional Ride, Waiting Charge, Advance, Balance)
 * - 100% Free WhatsApp auto-sharing (wa.me / whatsapp:// deep link, no paid API required)
 * - Automatic Email fallback to registered customer email
 */

import { Capacitor } from '@capacitor/core';
import { cleanLocationName } from './locationCleaner';
import { formatDistanceKm, formatDurationSeconds } from './geoDistance';

/**
 * Generate formatted text invoice
 */
export function generateTripInvoiceText(invoiceData) {
  const {
    trip = {},
    baseFare = 600,
    extraKm = 0,
    ratePerKm = 18,
    extensionFare = 0,
    waitingSeconds = 0,
    billableWaitingMinutes = 0,
    waitingRatePerMin = 2,
    waitingFare = 0,
    totalTripFare = 600,
    advancePaid = 0,
    balancePaid = null,
    driverName = 'Assigned Partner',
    driverPhone = '',
    riderName = '',
    riderPhone = '',
    paymentMethod = 'PhonePe Digital UPI'
  } = invoiceData;

  const tripId = trip.id || 'TRP-' + Date.now().toString().slice(-4);
  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const pickup = cleanLocationName(trip.pickup || trip.from) || 'Pickup Point';
  const drop = cleanLocationName(trip.drop_loc || trip.drop || trip.to) || 'Destination';
  const customerName = riderName || trip.rider?.name || trip.userName || 'Valued Customer';
  const advance = advancePaid || Number(trip.advance) || 0;
  const netPaid = balancePaid !== null ? balancePaid : Math.max(0, totalTripFare - advance);

  const lines = [
    '🧾 *RIDINGO OFFICIAL TRIP INVOICE*',
    `Trip ID: #${tripId}`,
    `Date & Time: ${nowStr}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `👤 Customer: ${customerName}`,
    `📍 Pickup: ${pickup}`,
    `🏁 Drop: ${drop}`,
    `🚗 Driver: ${driverName}${driverPhone ? ` (${driverPhone})` : ''}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '📊 *ITEMISED FARE BREAKDOWN:*',
    `• Base Booking Fare: ₹${baseFare}`
  ];

  if (extraKm > 0 || extensionFare > 0) {
    lines.push(`• Additional Ride (${formatDistanceKm(extraKm)} @ ₹${ratePerKm}/km): +₹${extensionFare}`);
  }

  if (waitingSeconds > 0 || waitingFare > 0) {
    const totalWaitingMins = Math.floor(waitingSeconds / 60);
    const waitingDetail = billableWaitingMinutes > 0
      ? `${totalWaitingMins} mins (First 60m Free, ${billableWaitingMinutes}m billable @ ₹${waitingRatePerMin}/min)`
      : `${totalWaitingMins} mins (100% Free · Under 60m allowance)`;
    lines.push(`• Waiting Charge (${waitingDetail}): ${waitingFare > 0 ? `+₹${waitingFare}` : '₹0 (Free)'}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 *Gross Trip Amount: ₹${totalTripFare}*`);

  if (advance > 0) {
    lines.push(`💳 Advance Paid: -₹${advance}`);
    lines.push(`💵 Final Settlement Paid: ₹${netPaid}`);
  } else {
    lines.push(`💵 Total Amount Paid: ₹${totalTripFare}`);
  }

  lines.push(`Payment Mode: ${paymentMethod}`);
  lines.push('Payment Status: ✅ PAID & SETTLED');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('Thank you for riding with Ridingo!');
  lines.push('24/7 Helpline: support@ridingo.app');

  return lines.join('\n');
}

/**
 * Clean and format Indian phone number for WhatsApp deep link
 */
export function sanitizeWhatsAppNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  } else if (clean.length === 12 && clean.startsWith('91')) {
    // already 91...
  }
  return clean;
}

/**
 * 100% Free WhatsApp Sharing via wa.me / whatsapp:// deep link
 * Requires NO paid business API.
 */
export function shareInvoiceViaWhatsApp(phone, invoiceText) {
  const cleanPhone = sanitizeWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(invoiceText);

  if (cleanPhone) {
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
      return true;
    }
  } else {
    // Open WhatsApp picker with prefilled text
    const waUrl = `https://wa.me/?text=${encodedText}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
      return true;
    }
  }
  return false;
}

/**
 * Email Sharing via mailto: or client dispatch
 */
export function shareInvoiceViaEmail(email, tripId, invoiceText) {
  const cleanEmail = String(email || '').trim();
  const subject = encodeURIComponent(`Ridingo Trip Invoice - #${tripId || 'TRP'}`);
  const body = encodeURIComponent(invoiceText);
  const mailtoUrl = cleanEmail
    ? `mailto:${cleanEmail}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;

  if (typeof window !== 'undefined') {
    window.location.href = mailtoUrl;
    return true;
  }
  return false;
}

/**
 * Auto-share helper:
 * Tries WhatsApp first (free). If WhatsApp fails or no phone, falls back to Email.
 */
export function autoShareTripInvoice({
  trip,
  invoiceData,
  preferredMethod = 'whatsapp'
}) {
  const invoiceText = generateTripInvoiceText(invoiceData);
  const riderPhone = trip?.rider?.phone || trip?.userPhone || trip?.phone || invoiceData?.riderPhone || '';
  const riderEmail = trip?.rider?.email || trip?.userEmail || trip?.email || invoiceData?.riderEmail || '';

  if (preferredMethod === 'whatsapp' && riderPhone) {
    const success = shareInvoiceViaWhatsApp(riderPhone, invoiceText);
    if (success) {
      return { success: true, method: 'whatsapp', recipient: riderPhone, invoiceText };
    }
  }

  // Fallback to Email if WhatsApp not selected or failed
  if (riderEmail) {
    const success = shareInvoiceViaEmail(riderEmail, trip?.id, invoiceText);
    return { success, method: 'email', recipient: riderEmail, invoiceText };
  }

  // Universal share fallback
  if (riderPhone) {
    const success = shareInvoiceViaWhatsApp(riderPhone, invoiceText);
    return { success, method: 'whatsapp', recipient: riderPhone, invoiceText };
  }

  return { success: false, method: 'none', invoiceText };
}
