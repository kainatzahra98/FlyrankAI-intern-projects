const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateReport = async (data, jobId) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `report_${jobId}.pdf`;
      const filepath = path.join(__dirname, 'reports', filename);
      
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Draw the PDF
      doc.fontSize(25).text('Regional Sales Aggregation Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      // Draw table header
      doc.fontSize(14).text('Region', 100, doc.y, { continued: true });
      doc.text('Total Revenue', 250, doc.y, { continued: true });
      doc.text('Sales Count', 400, doc.y);
      doc.moveDown(0.5);
      
      doc.moveTo(100, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(0.5);

      // Draw rows
      doc.fontSize(12);
      let totalRevenue = 0;
      data.forEach(row => {
        doc.text(row.region, 100, doc.y, { continued: true });
        doc.text(`$${row.total_revenue.toLocaleString()}`, 250, doc.y, { continued: true });
        doc.text(row.sales_count.toString(), 400, doc.y);
        doc.moveDown();
        totalRevenue += row.total_revenue;
      });

      doc.moveDown();
      doc.moveTo(100, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown();
      
      doc.fontSize(14).text(`Total Global Revenue: $${totalRevenue.toLocaleString()}`, 100, doc.y, { align: 'right' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(filename);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateReport };
