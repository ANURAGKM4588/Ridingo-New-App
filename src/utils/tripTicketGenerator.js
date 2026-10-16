/**
 * tripTicketGenerator.js
 * Generates a clean, modern, minimal ticket-style pass image for a trip.
 * Uses trip_ticket_fields.json as the strict source of truth for canvas dimensions and coordinates.
 */
import ticketConfig from '../assets/trip_ticket_fields.json';
import templateBgSrc from '../assets/trip_ticket_template.png';

export { ticketConfig };

/**
 * Loads an image async
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Generates a minimal ticket image using the JSON coordinates as the source of truth
 */
export async function generateTripTicketImage(trip) {
  if (!trip || typeof document === 'undefined') return null;

  const canvasWidth = ticketConfig.canvas?.width || 960;
  const canvasHeight = ticketConfig.canvas?.height || 1270;
  const textColor = ticketConfig.text_color || '#1C2130';
  const labelColor = ticketConfig.label_color || '#8B8A85';
  const fields = ticketConfig.fields;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Extract trip details
  const driverName =
    (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
    trip.driverObj?.name ||
    'Assigned Chauffeur';
  const pickup = trip.pickup || 'Pickup Location';
  const drop = trip.drop_loc || 'City Destination';
  const fare = Number(trip.fare) || 750;
  const otp = String(trip.startOtp || trip.otp || '4821').trim();
  const tripId = trip.id || 'TRP-1001';

  // 1. Draw Background Template Image (or vector fallback)
  const templateImg = await loadImage(templateBgSrc);
  if (templateImg) {
    ctx.drawImage(templateImg, 0, 0, canvasWidth, canvasHeight);
  } else {
    // Vector Template Fallback if image asset fails to load
    drawTemplateFallback(ctx, canvasWidth, canvasHeight, labelColor);
  }

  // Draw Trip ID Tag on header
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 22px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(tripId, canvasWidth - 60, 96);
  ctx.restore();

  // 2. Field: from_location (Strictly using JSON coordinates)
  if (fields.from_location) {
    const f = fields.from_location;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `700 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanPickup = fitSingleLine(ctx, pickup, f.width);
    ctx.fillText(cleanPickup, f.x, f.baseline);
    ctx.restore();
  }

  // 3. Field: to_location (Strictly using JSON coordinates)
  if (fields.to_location) {
    const f = fields.to_location;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `700 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanDrop = fitSingleLine(ctx, drop, f.width);
    ctx.fillText(cleanDrop, f.x, f.baseline);
    ctx.restore();
  }

  // 4. Field: driver_name (Strictly using JSON coordinates)
  if (fields.driver_name) {
    const f = fields.driver_name;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `750 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanDriver = fitSingleLine(ctx, driverName, f.width);
    ctx.fillText(cleanDriver, f.x, f.baseline);
    ctx.restore();
  }

  // 5. Field: total_fare (Strictly using JSON coordinates, includes currency symbol)
  if (fields.total_fare) {
    const f = fields.total_fare;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `900 ${f.suggested_font_px || 60}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const fareStr = `₹${fare}`;
    ctx.fillText(fareStr, f.x, f.baseline);
    ctx.restore();
  }

  // 6. Field: otp_text (Strictly using JSON digit boxes)
  if (fields.otp_text && Array.isArray(fields.otp_text.boxes)) {
    const f = fields.otp_text;
    const boxes = f.boxes;
    const fontPx = f.suggested_font_px || 84;

    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const digit = otp[i] || '0';

      // Center horizontally and vertically within each box
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      ctx.fillText(digit, centerX, centerY);
    }
    ctx.restore();
  }

  // Return as Blob, File, and DataURL
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const file = new File([blob], `ridingo-ticket-${tripId}.png`, { type: 'image/png' });
      resolve({
        blob,
        file,
        dataUrl: canvas.toDataURL('image/png')
      });
    }, 'image/png');
  });
}

/**
 * Truncates text with ellipsis if it exceeds the maximum allotted width
 */
function fitSingleLine(ctx, text, maxWidth) {
  const str = String(text || '').trim();
  if (!maxWidth || ctx.measureText(str).width <= maxWidth) {
    return str;
  }

  let truncated = str;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Fallback vector canvas renderer matching ticket template if background image fails
 */
function drawTemplateFallback(ctx, width, height, labelColor) {
  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Card outline
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(30, 30, width - 60, height - 60);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Header band
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(30, 30, width - 60, 120);

  ctx.fillStyle = '#FFC70A';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RIDINGO', 60, 85);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VERIFIED CHAUFFEUR PASS', 62, 118);

  // Labels
  ctx.fillStyle = labelColor;
  ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PICKUP LOCATION (FROM)', 140, 195);
  ctx.fillText('DROP DESTINATION (TO)', 140, 405);

  // Route markers
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.arc(86, 240, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(86, 260);
  ctx.lineTo(86, 430);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(72, 440, 28, 28);

  // Dividers
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(60, 560);
  ctx.lineTo(width - 60, 560);
  ctx.stroke();

  ctx.fillStyle = labelColor;
  ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ASSIGNED CHAUFFEUR', 60, 620);
  ctx.fillText('TOTAL FARE', 560, 620);

  ctx.beginPath();
  ctx.moveTo(60, 800);
  ctx.lineTo(width - 60, 800);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillText('TRIP PICKUP OTP', 60, 850);
  ctx.fillStyle = '#64748B';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Share this 4-digit verification code with your chauffeur upon arrival', 60, 885);

  // Digit boxes
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2.5;

  const boxes = [60, 280, 500, 720];
  boxes.forEach((bx) => {
    ctx.fillRect(bx, 990, 180, 150);
    ctx.strokeRect(bx, 990, 180, 150);
  });

  // Footer
  ctx.fillStyle = labelColor;
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🛡️ VERIFIED & TRACKED RIDE · RIDINGO CHAUFFEUR SERVICES', 60, 1200);
}
