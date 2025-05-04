import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface VoucherData {
  voucherId: number;
  voucherCode: string;
  discount: string;
  validUntil: string;
  matchPercentage: number;
}

export async function generateVoucherPDF(voucherData: VoucherData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5'
  });

  // Setup the voucher dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);
  
  // Set theme color from system
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#8e2c8e';
  const rgbPrimary = hexToRgb(primaryColor);
  
  // Add gradient background
  const gradientPages = doc.getNumberOfPages();
  for (let i = 0; i < gradientPages; i++) {
    doc.setPage(i + 1);
    
    // Create a gradient fill for the background
    for (let j = 0; j < pageHeight; j += 0.5) {
      const alpha = 1 - (j / pageHeight) * 0.5;
      // Simpler gradient approach without using GState
      // Adjust color intensity instead of using transparency
      const r = Math.round(rgbPrimary.r * alpha + 255 * (1 - alpha));
      const g = Math.round(rgbPrimary.g * alpha + 255 * (1 - alpha));
      const b = Math.round(rgbPrimary.b * alpha + 255 * (1 - alpha));
      doc.setFillColor(r, g, b);
      doc.rect(0, j, pageWidth, 0.5, 'F');
    }
  }
  
  // Draw decorative pattern on the sides
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  
  // Left side decorative pattern
  for (let y = margin; y < pageHeight - margin; y += 8) {
    doc.line(margin + 5, y, margin + 15, y);
  }
  
  // Right side decorative pattern
  for (let y = margin; y < pageHeight - margin; y += 8) {
    doc.line(pageWidth - margin - 15, y, pageWidth - margin - 5, y);
  }
  
  // Add elegant border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.setLineDashPattern([0], 0); // Solid line
  doc.roundedRect(margin, margin, contentWidth, contentHeight, 5, 5, 'S');
  
  // Inner border with different style
  doc.setLineWidth(0.75);
  doc.roundedRect(margin + 5, margin + 5, contentWidth - 10, contentHeight - 10, 3, 3, 'S');
  
  // Set text color to white for all text
  doc.setTextColor(255, 255, 255);
  
  // Add logo (circle placeholder for now)
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2, margin + 25, 15, 'F');
  
  // Add title with elegant typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('MAWADHA', pageWidth / 2, margin + 55, { align: 'center' });
  
  // Add tagline
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(14);
  doc.text('Be a better half', pageWidth / 2, margin + 65, { align: 'center' });
  
  // Add decorative divider
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, margin + 70, pageWidth / 2 + 30, margin + 70);
  
  // Discount section with larger, prominent text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(`${voucherData.discount}`, pageWidth / 2, margin + 90, { align: 'center' });
  
  // Description of what the discount is for
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(`COUPLES DINNER`, pageWidth / 2, margin + 100, { align: 'center' });
  
  // Voucher code in a box
  const codeBoxY = margin + 110;
  doc.setDrawColor(255, 255, 255);
  
  // Semi-transparent white (blended with background color)
  const whiteAlpha = 0.1;
  const whiteR = Math.round(255 * whiteAlpha + rgbPrimary.r * (1 - whiteAlpha));
  const whiteG = Math.round(255 * whiteAlpha + rgbPrimary.g * (1 - whiteAlpha));
  const whiteB = Math.round(255 * whiteAlpha + rgbPrimary.b * (1 - whiteAlpha));
  doc.setFillColor(whiteR, whiteG, whiteB);
  
  doc.roundedRect(pageWidth / 2 - 40, codeBoxY, 80, 12, 2, 2, 'FD');
  
  doc.setFont('courier', 'bold'); // Monospace font for codes
  doc.setFontSize(14);
  doc.text(`${voucherData.voucherCode}`, pageWidth / 2, codeBoxY + 8, { align: 'center' });
  
  // Format date
  const validUntil = new Date(voucherData.validUntil);
  const formattedDate = validUntil.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Validity information
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Valid until: ${formattedDate}`, pageWidth / 2, codeBoxY + 25, { align: 'center' });
  
  // Match percentage with a small success indicator
  const matchY = codeBoxY + 35;
  const matchPercentage = voucherData.matchPercentage;
  const matchText = `Compatibility Score: ${matchPercentage}%`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(matchText, pageWidth / 2, matchY, { align: 'center' });
  
  // Draw small hearts on the sides of the match percentage
  const heartSize = 3;
  drawHeart(doc, pageWidth / 2 - 50, matchY - 2, heartSize);
  drawHeart(doc, pageWidth / 2 + 50, matchY - 2, heartSize);
  
  // Bottom decorative line
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, pageHeight - margin - 15, pageWidth / 2 + 40, pageHeight - margin - 15);
  
  // Footer text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('This voucher was generated by the Mawadha Compatibility Challenge.', pageWidth / 2, pageHeight - margin - 8, { align: 'center' });
  
  // Mark voucher as downloaded in the database
  try {
    await fetch(`/api/vouchers/${voucherData.voucherId}/download`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error marking voucher as downloaded:', error);
  }
  
  // Save the PDF
  doc.save(`Mawadha-Voucher-${voucherData.voucherCode}.pdf`);
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string) {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

// Helper function to draw a heart shape
function drawHeart(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(255, 255, 255);
  
  // Draw a heart using bezier curves (simplified)
  const startX = x;
  const startY = y;
  
  doc.circle(startX - size/2, startY - size/4, size/2, 'F'); // Left circle
  doc.circle(startX + size/2, startY - size/4, size/2, 'F'); // Right circle
  
  // Triangle for bottom of heart
  doc.setFillColor(255, 255, 255);
  doc.triangle(
    startX - size, startY - size/4,
    startX + size, startY - size/4,
    startX, startY + size
  );
}
