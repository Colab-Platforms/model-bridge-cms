import path from "path";

import ejs from "ejs";
import { v2 as cloudinary } from "cloudinary";
import puppeteer from "puppeteer";

import { BillingConfigurationError } from "./billing.utils.js";

interface InvoiceTemplateInput {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceStatus: string;
  paymentReference: string;
  customerName: string;
  customerEmail: string;
  userId: string;
  providerName: string;
  currency: string;
  formattedAmount: string;
  itemDescription: string;
}

const templatePath = path.join(
  process.cwd(),
  "src",
  "modules",
  "billing",
  "templates",
  "invoice.ejs"
);

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    throw new BillingConfigurationError(
      "Cloudinary invoice upload is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET"
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const renderInvoicePdf = async (html: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};

const uploadInvoicePdf = async (pdf: Buffer, publicId: string) => {
  configureCloudinary();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ColabOne/invoices",
        public_id: publicId,
        resource_type: "raw",
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result?.secure_url ?? "");
      }
    );

    stream.end(pdf);
  });
};

export const renderInvoiceTemplate = async (input: InvoiceTemplateInput) =>
  ejs.renderFile(templatePath, input);

export const generateAndUploadInvoice = async (
  input: InvoiceTemplateInput & {
    paymentId: string;
  }
) => {
  const html = await renderInvoiceTemplate(input);
  const pdf = await renderInvoicePdf(html);
  const publicId = `${input.invoiceNumber}-${input.paymentId}`;
  return uploadInvoicePdf(pdf, publicId);
};
