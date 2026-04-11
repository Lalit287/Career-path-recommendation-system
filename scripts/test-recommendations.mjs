// Test recommendation scoring algorithm
async function testRecommendations() {
  try {
    console.log("🔍 Testing Recommendation Scoring Algorithm...\n");
    
    // Simulate MongoDB results
    const careerSample = [
      { title: "Junior Software Developer", domain: "Software Development", difficulty: "Beginner", skillsRequired: ["JavaScript", "React"] },
      { title: "Senior Backend Developer", domain: "Software Development", difficulty: "Advanced", skillsRequired: ["Java", "Microservices"] },
      { title: "Data Scientist", domain: "Data Science & Analytics", difficulty: "Advanced", skillsRequired: ["Python", "Machine Learning"] },
      { title: "BI Analyst", domain: "Data Science & Analytics", difficulty: "Intermediate", skillsRequired: ["SQL", "Tableau"] },
      { title: "DevOps Engineer", domain: "Cloud & DevOps", difficulty: "Advanced", skillsRequired: ["Docker", "Kubernetes"] },
      { title: "AI/ML Product Manager", domain: "Data Science & Analytics", difficulty: "Advanced", skillsRequired: ["Product Strategy"] },
    ];
    
    // Test user
    const testUser = {
      education: "high school",
      interests: ["Software Development", "Data Science & Analytics"],
      skills: []
    };
    
    console.log(`👤 Test User:`);
    console.log(`   Education: ${testUser.education}`);
    console.log(`   Interests: ${testUser.interests.join(", ")}`);
    console.log(`   Skills: none\n`);
    
    // Score each career
    const difficultyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
    const recommendations = careerSample
      .map(career => {
        // Skill score (no skills = baseline 8)
        const skillScore = 8;
        
        // Interest weight (no skills = 65%)
        const interestWeight = 65;
        
        // Check domain match
        const exactMatch = testUser.interests.some(
          i => i.toLowerCase() === career.domain.toLowerCase()
        );
        const interestScore = exactMatch ? interestWeight : 0;
        
        // Education score
        const userEdIndex = 0; // high school
        const diffIndex = difficultyLevels.indexOf(career.difficulty);
        const educationScore = Math.max(0, 20 - Math.abs(userEdIndex - diffIndex) * 5);
        
        const totalScore = skillScore + interestScore + educationScore;
        
        return {
          title: career.title,
          domain: career.domain,
          difficulty: career.difficulty,
          skillScore,
          interestScore,
          educationScore,
          totalScore: Math.round(totalScore)
        };
      })
      .filter(r => r.interestScore > 0) // Only show matches
      .sort((a, b) => b.totalScore - a.totalScore);
    
    console.log(`📈 Recommendations Scored:\n`);
    console.log("Score | Difficulty | Domain | Title");
    console.log("------|-------------|--------|------");
    recommendations.forEach((r) => {
      console.log(`${String(r.totalScore).padStart(5)} | ${r.difficulty.padEnd(11)} | ${r.domain.padEnd(20)} | ${r.title}`);
    });
    
    // Show differentiation
    const scores = new Set(recommendations.map(r => r.totalScore));
    console.log(`\n📊 Score Distribution: ${Array.from(scores).sort((a, b) => b - a).join(", ")}`);
    console.log("\n✅ Algorithm Test Complete");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testRecommendations();
