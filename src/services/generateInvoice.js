import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import streamBuffers from 'stream-buffers';
import { loadConfig } from '../config/loadConfig.js';
import Invoice from '../models/Invoices.model.js';

const config = await loadConfig();

const s3 = new S3Client({ region: config.AWS_REGION });

async function generateInvoice(invoices, s3Key) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        const writeStream = new streamBuffers.WritableStreamBuffer({
            initialSize: 400 * 1024,
            incrementAmount: 100 * 1024,
        });

        doc.pipe(writeStream);


        for (const invoiceData of invoices) {
            addInvoiceToDocument(doc, invoiceData);
            doc.addPage();
        }

        doc.end();

        writeStream.on('finish', async () => {
            const buffer = writeStream.getContents();
            try {
                const uploadCommand = new PutObjectCommand({
                    Bucket: config.AWS_BUCKET_NAME,
                    Key: s3Key,
                    Body: buffer,
                    ContentType: 'application/pdf',
                });

                await s3.send(uploadCommand);
                resolve(`https://${config.AWS_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`);
            } catch (error) {
                reject(error);
            }
        });
        writeStream.on('error', reject);
    });
}

function addInvoiceToDocument(doc, invoiceData) {
    doc.fontSize(20).text('INVOICE', { align: 'center' }).moveDown();

    doc
        .fontSize(12)
        .text(`To:${invoiceData?.user?.name || 'Unknown User'}`, 50, 100)
        .text(`Username: ${invoiceData?.user?.username || 'Unknown UserName'}`, 50, 115)
        .text(`Address: ${invoiceData?.user?.address || 'Unknown Address'}`, 50, 130)
        .text(`Email: ${invoiceData?.user?.email || 'Unknown Email'}`, 50, 145)
        .moveDown();

    const date = new Date(invoiceData.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });


    doc
        .text(`Project Name: ${invoiceData.projectName}`, 50, 180)
        .text(`Task Name: ${invoiceData.taskName || 'N/A'}`, 50, 195)
        .text(`Date: ${formattedDate}`, 50, 210)
        .text(`Invoice #: ${invoiceData.invoiceNumber}`, 50, 225)
        .moveDown();

    const invoiceTableTop = 260;
    doc
        .fontSize(12)
        .text('Item', 50, invoiceTableTop)
        .text('Quantity', 250, invoiceTableTop)
        .text('Price', 350, invoiceTableTop)
        .text('Total', 450, invoiceTableTop);

    let position = invoiceTableTop + 25;
    invoiceData.items.forEach(item => {
        const total = item.quantity * item.price;
        doc
            .text(item.name, 50, position)
            .text(item.quantity, 250, position)
            .text(item.price.toFixed(2), 350, position)
            .text(total.toFixed(2), 450, position);
        position += 20;
    });

    const totalAmount = invoiceData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    doc
        .fontSize(12)
        .text(`Total: $${totalAmount.toFixed(2)}`, 450, position + 20, {
            align: 'right',
        });
}



export default generateInvoice;
