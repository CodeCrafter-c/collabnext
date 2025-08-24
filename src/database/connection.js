const mongoose=require("mongoose");

async function connection() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_CONNECTION_STRING);
    console.log(`✅ Database connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    
    // Optional: close other resources here if needed
    // await someCleanupFunction();

    // Exit after a small delay to allow logs to flush
    setTimeout(() => process.exit(1), 400);
  }
}


module.exports={
    connection
}