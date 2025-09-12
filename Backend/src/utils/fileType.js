function isAllowed(fileType) {
  const safePrefixes = ["image/", "text/"];
  return (
    ALLOWED_TYPES.includes(fileType) ||
    safePrefixes.some(prefix => fileType.startsWith(prefix))
  );
}

module.exports={
    isAllowed
}