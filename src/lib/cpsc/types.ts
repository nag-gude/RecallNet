/** CPSC SaferProducts.gov Recall API response types (subset) */

export interface CpscProduct {
  Name: string;
  Description?: string;
  Model?: string;
  Type?: string;
  CategoryID?: string;
  NumberOfUnits?: string;
}

export interface CpscHazard {
  Name: string;
  HazardType?: string;
  HazardTypeID?: string;
}

export interface CpscRemedy {
  Name: string;
}

export interface CpscRemedyOption {
  Option: string;
}

export interface CpscUpc {
  UPC: string;
}

export interface CpscRetailer {
  Name: string;
  CompanyID?: string;
}

export interface CpscRecall {
  RecallID: number;
  RecallNumber: string;
  RecallDate: string;
  LastPublishDate: string;
  Title: string;
  Description: string;
  URL: string;
  ConsumerContact?: string;
  Products: CpscProduct[];
  Hazards: CpscHazard[];
  Remedies: CpscRemedy[];
  RemedyOptions: CpscRemedyOption[];
  ProductUPCs: CpscUpc[];
  Retailers?: CpscRetailer[];
  Images?: Array<{ URL: string; Caption?: string }>;
}
