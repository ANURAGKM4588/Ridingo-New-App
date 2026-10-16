/**
 * tripTicketGenerator.js
 * Generates a clean, modern, minimal ticket-style pass image for a trip.
 * Includes: From/To route, Chauffeur name, Total fare, Trip Pickup OTP, Trip ID, and Branding.
 */

export async function generateTripTicketImage(trip) {
  if (!trip) return null;

  const width = 800;
  const height = 1060;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const driverName =
    (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
    trip.driverObj?.name ||
    'Assigned Chauffeur';
  const pickup = trip.pickup || 'Pickup Location';
  const drop = trip.drop_loc || 'City Destination';
  const fare = Number(trip.fare) || 750;
  const otp = trip.startOtp || trip.otp || '4821';
  const tripId = trip.id || 'TRP-1001';
  const dateStr = trip.scheduleDisplay || 'Immediate Pickup';

  // 1. Background (Subtle luxury off-white / light neutral)
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 2. Ticket Card Body (Rounded rectangle with subtle drop shadow)
  const cardX = 40;
  const cardY = 40;
  const cardW = width - 80;
  const cardH = height - 80;
  const radius = 28;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';

  // Rounded card path
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardW - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
  ctx.lineTo(cardX + cardW, cardY + cardH - radius);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
  ctx.lineTo(cardX + radius, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Ticket Top Header Banner (Sleek Obsidian Black)
  const headerH = 150;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardW - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
  ctx.lineTo(cardX + cardW, cardY + headerH);
  ctx.lineTo(cardX, cardY + headerH);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.closePath();
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.restore();

  // Header Branding: "RIDINGO" + "CHAUFFEUR PASS"
  ctx.fillStyle = '#FACC15';
  ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RIDINGO', cardX + 36, cardY + 68);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('VERIFIED CHAUFFEUR PASS', cardX + 38, cardY + 98);

  // Trip ID Badge on Top Right
  const badgeW = 150;
  const badgeH = 38;
  const badgeX = cardX + cardW - badgeW - 36;
  const badgeY = cardY + 54;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(tripId, badgeX + badgeW / 2, badgeY + 24);
  ctx.textAlign = 'left';

  // 4. Ticket Perforated Circles (Left & Right Cutouts)
  const perfY = cardY + headerH;
  ctx.fillStyle = '#F8FAFC';

  // Left circle cutout
  ctx.beginPath();
  ctx.arc(cardX, perfY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Right circle cutout
  ctx.beginPath();
  ctx.arc(cardX + cardW, perfY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Dashed tear line across
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 24, perfY);
  ctx.lineTo(cardX + cardW - 24, perfY);
  ctx.stroke();
  ctx.restore();

  // 5. Route Section (FROM -> TO)
  const routeY = perfY + 45;

  // FROM / PICKUP
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.arc(cardX + 46, routeY + 8, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748B';
  ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PICKUP (FROM)', cardX + 70, routeY);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  wrapText(ctx, pickup, cardX + 70, routeY + 28, cardW - 120, 26, 2);

  // Vertical route connector dotted line
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 46, routeY + 24);
  ctx.lineTo(cardX + 46, routeY + 98);
  ctx.stroke();
  ctx.restore();

  // TO / DESTINATION
  const destY = routeY + 110;
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(cardX + 46, destY + 8, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748B';
  ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DESTINATION (TO)', cardX + 70, destY);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  wrapText(ctx, drop, cardX + 70, destY + 28, cardW - 120, 26, 2);

  // Divider line
  const midY = destY + 85;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, midY);
  ctx.lineTo(cardX + cardW - 36, midY);
  ctx.stroke();

  // 6. Information Grid: Chauffeur & Total Fare
  const gridY = midY + 32;

  // Box 1: Driver
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, cardX + 36, gridY, (cardW - 88) / 2, 88, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ASSIGNED CHAUFFEUR', cardX + 54, gridY + 28);

  ctx.fillStyle = '#0F172A';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(driverName, cardX + 54, gridY + 58);

  // Box 2: Total Fare
  const fareX = cardX + 36 + (cardW - 88) / 2 + 16;
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, fareX, gridY, (cardW - 88) / 2, 88, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL TRIP FARE', fareX + 18, gridY + 28);

  ctx.fillStyle = '#16A34A';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`₹${fare}`, fareX + 18, gridY + 62);

  // 7. Prominent Minimal Ticket Stub: Start OTP Box
  const otpBoxY = gridY + 112;
  const otpBoxW = cardW - 72;
  const otpBoxH = 110;

  ctx.fillStyle = '#0F172A';
  roundRect(ctx, cardX + 36, otpBoxY, otpBoxW, otpBoxH, 20);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TRIP PICKUP OTP (SHARE WITH DRIVER)', cardX + 60, otpBoxY + 36);

  ctx.fillStyle = '#FACC15';
  ctx.font = '900 42px monospace';
  ctx.letterSpacing = '8px';
  ctx.fillText(otp, cardX + 60, otpBoxY + 84);

  // Security Verified Shield on the right of OTP box
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🛡️ Verified Ride', cardX + 36 + otpBoxW - 24, otpBoxY + 48);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(dateStr, cardX + 36 + otpBoxW - 24, otpBoxY + 74);
  ctx.textAlign = 'left';

  // 8. Footer Bar with Live Tracking Link
  const footY = cardY + cardH - 85;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, footY);
  ctx.lineTo(cardX + cardW - 36, footY);
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Live GPS Tracking available at:', cardX + 36, footY + 40);

  ctx.fillStyle = '#2563EB';
  ctx.font = '800 14px monospace';
  ctx.fillText(`https://ridingo.app/track/${tripId}`, cardX + 36, footY + 62);

  // Return as Blob and File
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const file = new File([blob], `ridingo-ticket-${tripId}.png`, { type: 'image/png' });
      resolve({ blob, file, dataUrl: canvas.toDataURL('image/png') });
    }, 'image/png');
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = (text || '').split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        // Truncate remaining
        const remaining = words.slice(n).join(' ');
        let truncated = remaining;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + '...', x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}
