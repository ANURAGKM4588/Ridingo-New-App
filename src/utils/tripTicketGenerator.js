/**
 * tripTicketGenerator.js
 * Generates a clean, modern, minimal ticket-style pass image for a trip.
 * Uses trip_ticket_fields.json as the strict source of truth for canvas dimensions and coordinates.
 */
import ticketConfig from '../assets/trip_ticket_fields.json';
import templateBgSrc from '../assets/trip_ticket_template.png';
import { cleanLocationName, getLocationUpToFirstComma } from './locationCleaner';

const DEFAULT_CONFIG = {
  canvas: { width: 960, height: 1270 },
  text_color: '#1C2130',
  label_color: '#8B8A85',
  fields: {
    from_location: { type: 'text', x: 140, y: 208, width: 760, height: 76, baseline: 284, align: 'left', suggested_font_px: 52 },
    to_location: { type: 'text', x: 140, y: 420, width: 760, height: 76, baseline: 496, align: 'left', suggested_font_px: 52 },
    driver_name: { type: 'text', x: 60, y: 640, width: 440, height: 76, baseline: 716, align: 'left', suggested_font_px: 52 },
    total_fare: { type: 'text', x: 560, y: 640, width: 340, height: 76, baseline: 716, align: 'left', suggested_font_px: 60 },
    otp_text: {
      type: 'digit_boxes',
      count: 4,
      boxes: [
        { x: 60, y: 990, width: 180, height: 180 },
        { x: 280, y: 990, width: 180, height: 180 },
        { x: 500, y: 990, width: 180, height: 180 },
        { x: 720, y: 990, width: 180, height: 180 }
      ],
      suggested_font_px: 84
    }
  }
};

const resolvedConfig =
  ticketConfig && (ticketConfig.fields || ticketConfig.canvas)
    ? ticketConfig
    : ticketConfig && ticketConfig.default && (ticketConfig.default.fields || ticketConfig.default.canvas)
      ? ticketConfig.default
      : DEFAULT_CONFIG;

export { resolvedConfig as ticketConfig };

/**
 * Loads an image async with resilient fallback paths
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
    img.onerror = () => {
      // Fallback to public folder path if bundled asset URL fails
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = '/assets/trip_ticket_template.png';
    };
    img.src = src;
  });
}

/**
 * Generates a minimal ticket image using the JSON coordinates as the source of truth
 */
export async function generateTripTicketImage(trip) {
  if (!trip || typeof document === 'undefined') return null;

  const config = resolvedConfig || DEFAULT_CONFIG;
  const canvasWidth = config.canvas?.width || 960;
  const canvasHeight = config.canvas?.height || 1270;
  const textColor = config.text_color || '#1C2130';
  const labelColor = config.label_color || '#8B8A85';
  const fields = config.fields || DEFAULT_CONFIG.fields;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Extract trip details
  const driverName =
    (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
    trip.driverObj?.name ||
    'Assigned Driver';
  const pickup = getLocationUpToFirstComma(trip.pickup, 'Pickup Location');
  const drop = getLocationUpToFirstComma(trip.drop_loc, 'City Destination');
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

  // Draw Trip ID in header top-right, aligned with "TRIP DETAILS"
  ctx.save();
  ctx.fillStyle = labelColor;
  ctx.font = '600 28px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(tripId, canvasWidth - 60, 68);
  ctx.restore();

  // 2. Field: from_location (Strictly using JSON coordinates)
  if (fields?.from_location) {
    const f = fields.from_location;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `600 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanPickup = fitSingleLine(ctx, pickup, f.width);
    ctx.fillText(cleanPickup, f.x, f.baseline);
    ctx.restore();
  }

  // 3. Field: to_location (Strictly using JSON coordinates)
  if (fields?.to_location) {
    const f = fields.to_location;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `600 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanDrop = fitSingleLine(ctx, drop, f.width);
    ctx.fillText(cleanDrop, f.x, f.baseline);
    ctx.restore();
  }

  // 4. Field: driver_name (Strictly using JSON coordinates)
  if (fields?.driver_name) {
    const f = fields.driver_name;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `650 ${f.suggested_font_px || 52}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const cleanDriver = fitSingleLine(ctx, driverName, f.width);
    ctx.fillText(cleanDriver, f.x, f.baseline);
    ctx.restore();
  }

  // 5. Field: total_fare (Strictly using JSON coordinates, includes currency symbol)
  if (fields?.total_fare) {
    const f = fields.total_fare;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `800 ${f.suggested_font_px || 60}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = f.align || 'left';
    ctx.textBaseline = 'alphabetic';

    const fareStr = `₹${fare}`;
    ctx.fillText(fareStr, f.x, f.baseline);
    ctx.restore();
  }

  // 6. Field: otp_text (Strictly using JSON digit boxes)
  if (fields?.otp_text && Array.isArray(fields.otp_text.boxes)) {
    const f = fields.otp_text;
    const boxes = f.boxes;
    const fontPx = f.suggested_font_px || 84;

    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `800 ${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
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
 * Fallback vector canvas renderer matching user's template if background image fails
 */
function drawTemplateFallback(ctx, width, height, labelColor) {
  // 1. Soft warm background
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, width, height);

  // 2. Header: "TRIP DETAILS"
  ctx.fillStyle = labelColor;
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('TRIP DETAILS', 60, 68);
  ctx.letterSpacing = '0px';

  ctx.strokeStyle = '#D8D4CC';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 88);
  ctx.lineTo(width - 60, 88);
  ctx.stroke();

  // 3. FROM section
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('FROM', 140, 146);
  ctx.letterSpacing = '0px';

  // Amber route target pin
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(84, 194, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.arc(84, 194, 5, 0, Math.PI * 2);
  ctx.fill();

  // Dotted route line
  ctx.fillStyle = '#D8D4CC';
  for (let dy = 220; dy < 330; dy += 20) {
    ctx.beginPath();
    ctx.arc(84, dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Underline for FROM
  ctx.strokeStyle = '#D8D4CC';
  ctx.beginPath();
  ctx.moveTo(140, 222);
  ctx.lineTo(width - 60, 222);
  ctx.stroke();

  // 4. TO section
  ctx.fillStyle = labelColor;
  ctx.letterSpacing = '2px';
  ctx.fillText('TO', 140, 310);
  ctx.letterSpacing = '0px';

  // Amber square pin
  ctx.fillStyle = '#D97706';
  ctx.fillRect(70, 348, 28, 28);

  // Underline for TO
  ctx.beginPath();
  ctx.moveTo(140, 390);
  ctx.lineTo(width - 60, 390);
  ctx.stroke();

  // 5. DRIVER & FARE labels and underlines
  ctx.fillStyle = labelColor;
  ctx.letterSpacing = '2px';
  ctx.fillText('DRIVER', 60, 480);
  ctx.fillText('FARE', 560, 480);
  ctx.letterSpacing = '0px';

  ctx.beginPath();
  ctx.moveTo(60, 565);
  ctx.lineTo(500, 565);
  ctx.moveTo(560, 565);
  ctx.lineTo(width - 60, 565);
  ctx.stroke();

  // 6. Perforated tear line & half-circle cutouts
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 686, 32, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width, 686, 32, Math.PI / 2, -Math.PI / 2);
  ctx.fill();

  ctx.strokeStyle = '#D8D4CC';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(60, 686);
  ctx.lineTo(width - 60, 686);
  ctx.stroke();
  ctx.setLineDash([]);

  // 7. OTP section
  ctx.fillStyle = labelColor;
  ctx.letterSpacing = '2px';
  ctx.fillText('OTP', 60, 750);
  ctx.letterSpacing = '0px';

  // 4 OTP boxes
  ctx.strokeStyle = '#1C2130';
  ctx.lineWidth = 3;
  const boxes = [60, 280, 500, 720];
  boxes.forEach((bx) => {
    ctx.strokeRect(bx, 990, 180, 150);
  });

  ctx.fillStyle = labelColor;
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('SHARE ONLY WITH YOUR DRIVER', 60, 1180);
  ctx.letterSpacing = '0px';
}
