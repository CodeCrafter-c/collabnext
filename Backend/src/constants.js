const Max_SIZE_ALLOWED=10*1024*1024;

const ALLOWED_TYPES = [
  // === Documents ===
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",

  // === Word / Excel / PPT ===
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

  // === Images ===
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",

  // === Archives (optional, for zipped submissions) ===
  "application/zip",

  // === Design Source Files ===
  "application/octet-stream", // Figma .fig (defaults to this MIME)
  "application/vnd.adobe.xd", // Adobe XD
  "image/vnd.adobe.photoshop", // Photoshop .psd
  "application/postscript", // Illustrator .ai
];






module.exports={
    Max_SIZE_ALLOWED,
    ALLOWED_TYPES
}