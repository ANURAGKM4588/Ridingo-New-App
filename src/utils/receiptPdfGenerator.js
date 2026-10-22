/**
 * Pure JavaScript Clean & Minimal PDF Receipt Generator for Ridingo
 * Produces valid, beautiful vector PDF files with the official Ridingo Logo
 * and triggers immediate client-side file download.
 */

import { cleanLocationName } from './locationCleaner';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import {
  RIDINGO_LOGO_JPEG_BASE64,
  RIDINGO_LOGO_WIDTH,
  RIDINGO_LOGO_HEIGHT
} from './ridingoLogoBase64';

function escapePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Keep standard printable ASCII
}

function concatUint8Arrays(arrays) {
  let totalLength = 0;
  for (const arr of arrays) totalLength += arr.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function base64ToUint8Array(base64) {
  const binaryString = typeof atob !== 'undefined'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)));
  }
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
}

/**
 * Builds a valid PDF 1.4 document buffer as a Uint8Array from receipt data
 */
export function buildReceiptPdfBuffer(data) {
  const {
    trip = {},
    tripId = trip.id || `TRP-${Date.now().toString().slice(-6)}`,
    dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    pickup = cleanLocationName(trip.pickup || 'Pickup Location'),
    drop = cleanLocationName(trip.drop_loc || trip.drop || 'Destination Location'),
    takingTime = trip.qty ? `${trip.qty} ${trip.qty === 1 ? 'hour' : 'hours'}` : (trip.durationText || '3 hours'),
    runningTime = trip.durationText || '2 hrs 15 mins',
    totalDistance = trip.distanceText || `${trip.distanceKm || '38'} km`,
    extraKm = trip.extensionDistanceKm || 0,
    waitingCharge = trip.waitingFare || 0,
    baseFare = Number(trip.fare || 750),
    advancePaid = Number(trip.advance || Math.round(baseFare * 0.3) || 225),
    waitingAndExtra = Number(trip.extensionFare || 0) + Number(waitingCharge),
    totalFare = baseFare + waitingAndExtra,
    balancePaid = Math.max(0, totalFare - advancePaid),
    driverName = (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) || 'Suresh K.',
    serviceCategory = String(trip.cat || 'hourly').toUpperCase() + ' DRIVER SERVICE'
  } = data;

  const encoder = new TextEncoder();
  const contentStream = [];

  // Helper to add text
  const addText = (text, x, y, font = 'F1', size = 10, color = '0 0 0') => {
    contentStream.push(
      `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdfText(text)}) Tj ET`
    );
  };

  // Helper to draw horizontal line
  const addLine = (x1, y1, x2, y2, gray = 0.85, width = 1) => {
    contentStream.push(
      `${gray} G ${width} w ${x1} ${y1} m ${x2} ${y2} l S`
    );
  };

  // Helper to draw rectangle box
  const addRect = (x, y, w, h, fillGray = 0.96, strokeGray = 0.85) => {
    contentStream.push(
      `${strokeGray} G ${fillGray} g 1 w ${x} ${y} ${w} ${h} B`
    );
  };

  // --- PDF CONTENT LAYOUT (A4 Size: 595 x 842 points) ---

  // 1. Header Box
  addRect(40, 735, 515, 75, 0.98, 0.88);

  // Official Ridingo Brand Logo (Aspect ratio ~2.84:1, width 94pt, height 33.1pt)
  contentStream.push(`q\n94 0 0 33.1 55 766 cm\n/ImLogo Do\nQ`);
  addText('ON-DEMAND VERIFIED DRIVER SERVICE', 55, 752, 'F1', 8, '0.4 0.45 0.5');
  addText('OFFICIAL TRIP RECEIPT & TAX INVOICE', 55, 740, 'F2', 9.5, '0.08 0.5 0.24');

  addText(`RECEIPT NO: #${tripId}`, 400, 782, 'F2', 10, '0.1 0.1 0.1');
  addText(`Date: ${dateStr}`, 400, 768, 'F1', 8.5, '0.4 0.45 0.5');
  addText('Status: PAID IN FULL', 400, 752, 'F2', 9, '0.08 0.5 0.24');

  // 2. Service & Driver Summary
  addText('SERVICE & DRIVER DETAILS', 40, 715, 'F2', 10.5, '0.1 0.1 0.1');
  addLine(40, 708, 555, 708, 0.8);

  addText('Service Category:', 40, 692, 'F1', 9, '0.4 0.45 0.5');
  addText(serviceCategory, 140, 692, 'F2', 9, '0.1 0.1 0.1');

  addText('Assigned Driver:', 340, 692, 'F1', 9, '0.4 0.45 0.5');
  addText(`${driverName} (Verified Partner)`, 425, 692, 'F2', 9, '0.1 0.1 0.1');

  addText('Total Duration:', 40, 674, 'F1', 9, '0.4 0.45 0.5');
  addText(takingTime, 140, 674, 'F2', 9, '0.1 0.1 0.1');

  addText('Running Time:', 340, 674, 'F1', 9, '0.4 0.45 0.5');
  addText(runningTime, 425, 674, 'F2', 9, '0.1 0.1 0.1');

  // 3. Route Details Box
  addRect(40, 580, 515, 78, 0.98, 0.88);
  addText('ROUTE & TRIP LOGISTICS', 55, 638, 'F2', 10, '0.1 0.1 0.1');
  addLine(55, 632, 540, 632, 0.9);

  addText('FROM (Pickup):', 55, 616, 'F2', 8.5, '0.08 0.5 0.24');
  addText(pickup.slice(0, 65), 150, 616, 'F1', 8.5, '0.15 0.15 0.15');

  addText('TO (Destination):', 55, 598, 'F2', 8.5, '0.85 0.2 0.2');
  addText(drop.slice(0, 65), 150, 598, 'F1', 8.5, '0.15 0.15 0.15');

  // 4. Metrics Grid (Distance, Extra KM, Waiting)
  addRect(40, 515, 165, 50, 0.97, 0.88);
  addText('TOTAL DISTANCE', 52, 548, 'F1', 8, '0.45 0.45 0.45');
  addText(totalDistance, 52, 530, 'F2', 13, '0.1 0.1 0.1');

  addRect(215, 515, 165, 50, 0.97, 0.88);
  addText('ADDITIONAL TRIP KM', 227, 548, 'F1', 8, '0.45 0.45 0.45');
  addText(`${extraKm} km`, 227, 530, 'F2', 13, '0.1 0.1 0.1');

  addRect(390, 515, 165, 50, 0.97, 0.88);
  addText('WAITING CHARGE', 402, 548, 'F1', 8, '0.45 0.45 0.45');
  addText(waitingCharge > 0 ? `INR ${waitingCharge}` : 'INR 0 (Free)', 402, 530, 'F2', 13, '0.1 0.1 0.1');

  // 5. Itemized Fare Breakdown Table
  addText('ITEMIZED FARE BREAKDOWN', 40, 480, 'F2', 10.5, '0.1 0.1 0.1');
  addLine(40, 473, 555, 473, 0.8);

  addRect(40, 448, 515, 20, 0.92, 0.85);
  addText('DESCRIPTION', 52, 455, 'F2', 8.5, '0.2 0.2 0.2');
  addText('AMOUNT (INR)', 470, 455, 'F2', 8.5, '0.2 0.2 0.2');

  let curY = 430;
  const addFareRow = (title, amtStr, isBold = false, isGreen = false) => {
    addText(title, 52, curY, isBold ? 'F2' : 'F1', 9, isGreen ? '0.08 0.5 0.24' : '0.15 0.15 0.15');
    addText(amtStr, 480, curY, isBold ? 'F2' : 'F1', 9, isGreen ? '0.08 0.5 0.24' : '0.15 0.15 0.15');
    addLine(40, curY - 5, 555, curY - 5, 0.92);
    curY -= 20;
  };

  addFareRow('Base Driver Booking Charge', `INR ${baseFare}`);
  if (extraKm > 0 || Number(trip.extensionFare || 0) > 0) {
    addFareRow(`Additional Extension Route (${extraKm} km)`, `INR ${trip.extensionFare || 0}`);
  }
  addFareRow('Waiting Time Allowance & Extra Waiting', waitingCharge > 0 ? `INR ${waitingCharge}` : 'INR 0 (Free)');
  addFareRow('Advance Paid Online (Confirmation)', `- INR ${advancePaid}`, false, true);

  // Total Paid / Balance Paid Highlight Box
  curY -= 10;
  addRect(40, curY - 32, 515, 42, 0.98, 0.2);
  addText('PAY THE DRIVER (Final Settlement Balance):', 52, curY - 14, 'F2', 10, '0.1 0.1 0.1');
  addText(`INR ${balancePaid}`, 450, curY - 14, 'F2', 14, '0.08 0.5 0.24');

  curY -= 55;
  addText('TOTAL TRIP FARE:', 52, curY, 'F2', 11, '0.1 0.1 0.1');
  addText(`INR ${totalFare}`, 470, curY, 'F2', 13, '0.1 0.1 0.1');
  addLine(40, curY - 8, 555, curY - 8, 0.5, 1.5);

  // 6. Security & Support Footer
  addText('Thank you for riding with Ridingo Driver Service!', 40, 150, 'F2', 10, '0.1 0.1 0.1');
  addText('24/7 Support Hotline: 1800-RIDINGO (1800-743-4646)  |  Email: help@ridingo.app', 40, 136, 'F1', 8.5, '0.45 0.45 0.45');
  addText('This is a computer-generated official trip receipt and requires no physical signature.', 40, 122, 'F1', 8, '0.55 0.55 0.55');

  const streamBody = contentStream.join('\n');
  const streamBytes = encoder.encode(streamBody);

  const imgBytes = base64ToUint8Array(RIDINGO_LOGO_JPEG_BASE64);

  // Build PDF Objects
  const obj1 = encoder.encode(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  const obj2 = encoder.encode(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  const obj3 = encoder.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /ImLogo 7 0 R >> >> /Contents 6 0 R >>\nendobj\n`);
  const obj4 = encoder.encode(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  const obj5 = encoder.encode(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  const obj6Header = encoder.encode(`6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
  const obj6Footer = encoder.encode(`\nendstream\nendobj\n`);
  const obj6 = concatUint8Arrays([obj6Header, streamBytes, obj6Footer]);

  const obj7Header = encoder.encode(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${RIDINGO_LOGO_WIDTH} /Height ${RIDINGO_LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
  const obj7Footer = encoder.encode(`\nendstream\nendobj\n`);
  const obj7 = concatUint8Arrays([obj7Header, imgBytes, obj7Footer]);

  const objects = [obj1, obj2, obj3, obj4, obj5, obj6, obj7];

  const header = encoder.encode('%PDF-1.4\n');
  let currentOffset = header.length;
  const xrefEntries = ['0000000000 65535 f \n'];

  const parts = [header];
  for (const obj of objects) {
    xrefEntries.push(String(currentOffset).padStart(10, '0') + ' 00000 n \n');
    currentOffset += obj.length;
    parts.push(obj);
  }

  const xrefOffset = currentOffset;
  const xref = encoder.encode(`xref\n0 ${objects.length + 1}\n` + xrefEntries.join(''));
  const trailer = encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  parts.push(xref, trailer);
  return concatUint8Arrays(parts);
}

/**
 * Directly downloads the receipt PDF to user's device
 */
export async function downloadTripReceiptPdf(receiptData) {
  const tripId = receiptData.trip?.id || receiptData.tripId || `TRP-${Date.now().toString().slice(-6)}`;
  const fileName = `ridingo-receipt-${tripId}.pdf`;

  const pdfBytes = buildReceiptPdfBuffer(receiptData);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  // A. Mobile Native via Capacitor Filesystem
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = uint8ArrayToBase64(pdfBytes);
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents
      });

      if (result?.uri) {
        await Share.share({
          title: `Ridingo Receipt · #${tripId}`,
          text: `Here is your Ridingo Trip Receipt #${tripId}`,
          files: [result.uri],
          dialogTitle: 'Download Trip Receipt'
        });
        return { success: true, fileName };
      }
    } catch (e) {
      console.warn('[receiptPdfGenerator] Native filesystem note:', e);
    }
  }

  // B. Standard Web Browser Auto-Download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
    return { success: true, fileName };
  } catch (err) {
    console.error('[receiptPdfGenerator] Download error:', err);
    throw err;
  }
}
