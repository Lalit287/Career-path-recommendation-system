import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

async function testMongoDB() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set. Please configure it in your environment.");
    }

    console.log("🔍 Testing MongoDB Connection & Data...\n");
    
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    
    // Use raw connection to query
    const db = mongoose.connection.db;
    const jobProfiles = db.collection("job_profiles");
    
    // Count total
    const count = await jobProfiles.countDocuments();
    console.log(`📊 Total jobs in DB: ${count}`);
    
    // Check by domain
    const softwareDev = await jobProfiles.countDocuments({ domain: "Software Development" });
    const dataSci = await jobProfiles.countDocuments({ domain: /Data Science/ });
    
    console.log(`   - Software Development: ${softwareDev}`);
    console.log(`   - Data Science & Analytics: ${dataSci}\n`);
    
    // Sample a few records
    console.log(`📋 Sample Records:\n`);
    const samples = await jobProfiles.find({}).limit(5).toArray();
    samples.forEach(job => {
      console.log(`   • ${job.title} (${job.domain})`);
    });
    
    console.log(`\n✅ MongoDB Test Complete`);
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testMongoDB();
