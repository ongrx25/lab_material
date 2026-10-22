// Rows shaped like the real Stock_record tab (formatted values as the Sheets API returns them).
export const STOCK_HEADER = [
  "วัสดุวิทยาศาสตร์และการแพทย์ กลุ่มงานเทคนิคการแพทย์ No.",
  "Item code", "Item discription", "Distributor", " UOM", "In", "Out",
  "Quantity", "Unit Price", "Amount(Baht)", "Lot", "EXP.", "Inv#",
];

export const STOCK_ROWS: string[][] = [
  STOCK_HEADER,
  ["1", "LAB-01", "Albumin", "FIRMER", "Set", "", "", "0", " 4,368.00", "0.00", "", "", ""],
  ["2", "LAB-02", "AST", "FIRMER", "Set", "", "", "0", " 14,318.00", "0.00", "", "", ""],
  ["3", "LAB-03", "DTX Strip", "RICH & LESS", "Box", "200", "158", "42", " 350.00", "14,700.00", "200092", "26/02/2571", "INV6910-0340"],
  ["4", "LAB-04", "HCG Strip", "LABMASTER", "Box", "500", "430", "70", " 12.00", "840.00", "", "28/05/2570", ""],
  ["5", "LAB-05", "DCIP", "THAI DIAG", "Set", "2", "1", "1", " 1,500.00", "1,500.00", "", "20/04/2570", ""],
  ["6", "LAB-06", "Matrix AHG (Coomb) Test card", "MEDICAL LAB", "Box", "3", "2", "1", " 2,400.00", "2,400.00", "50530.2613", "01/05/2570", ""],
  ["7", "LAB-07", "K3EDTA vac. 2 ml", "FIRMER", "Pack", "1000", "130", "870", " 2.50", "2,175.00", "251129", "01/11/2570", ""],
  ["8", "LAB-08", "Faecal Occult blood", "LABMASTER", "Box", "45", "37", "8", " 95.00", "760.00", "2512010602", "01/12/2570", ""],
  ["9", "LAB-09", "Urine container", "FIRMER", "Pieces", "1000", "651", "349", " 3.00", "1,047.00", "260531", "01/05/2579", ""],
  ["10", "LAB-10", "Gram stain", "LABMASTER", "Set", "1", "0", "1", " 850.00", "850.00", "", "01/05/2569", ""],
  ["11", "LAB-11", "RPR", "LABMASTER", "Box", "", "", "0", " 1,750.00", "0.00", "", "", ""],
  ["", "", "", "", "", "", "", "", "24,232.00", "", "", "", ""],
];

export const USER_ROWS: string[][] = [
  ["id", "username", "password", "name", "position"],
  ["1", "jo", "1234", "โจ ทดสอบ", "นวก.เทคนิคการแพทย์"],
  ["2", "yonlada", "abcd", "ยลดา ทดสอบ", "นักเทคนิคการแพทย์"],
];
