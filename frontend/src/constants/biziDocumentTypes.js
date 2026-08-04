// Kuzana's own real DD document ask (bizi_verification.md stage 5) -
// mirrors the backend's Vokazi.Bizi.Document @types exactly.
export const BIZI_DOCUMENT_TYPES = ["management_accounts", "cr12", "purchase_sales_docs", "other"];

export const BIZI_DOCUMENT_TYPE_LABELS = {
  management_accounts: "Management accounts",
  cr12: "CR12",
  purchase_sales_docs: "Purchase/sales docs",
  other: "Other",
};

export const biziDocumentTypeLabel = (type) => BIZI_DOCUMENT_TYPE_LABELS[type] || type;
