import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});


// ==============================
// ✅ RESUME SCORER API
// ==============================
app.post("/api/resume-score", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { resumeText } = req.body;
        if (!resumeText) {
            return res.status(400).json({ error: "No resume text provided" });
        }

       const prompt = `You are an expert ATS Scoring Engine. 
Analyze the following resume and provide a realistic score. 
IMPORTANT: The score must be a number between 60 and 90, where 60 is a basic match and 90 is a near-perfect match. 
Return ONLY valid JSON with keys: 
"score" (number), "summary" (string), "strengths" (array), "missing_keywords" (array), and "suggestions" (array). 

Resume: ${resumeText}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        const aiResult = JSON.parse(data.choices[0].message.content);
        res.json(aiResult);

    } catch (error) {
        console.error("Resume API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==============================
// ✅ JD MATCH API (The missing piece)
// ==============================
app.post("/api/jd-match", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { profile, jdText } = req.body;
        
        if (!profile || !jdText) {
            return res.status(400).json({ error: "Missing profile data or job description" });
        }

        // Convert the profile object into a string for the AI to read easily
        const candidateProfile = `
        Name: ${profile.name}
        Bio: ${profile.bio}
        Skills: ${profile.skills.join(", ")}
        Experience: ${JSON.stringify(profile.experience)}
        Projects: ${JSON.stringify(profile.projects)}
        Certifications: ${profile.certifications.join(", ")}
        `;

        const prompt = `
        You are an expert ATS and Career Coach. Analyze the Candidate Profile against the Job Description.
        
        CANDIDATE PROFILE:
        ${candidateProfile}

        JOB DESCRIPTION:
        ${jdText}

        STRICT JSON RESPONSE FORMAT:
        {
          "match_score": 85,
          "verdict": "Strong match with minor skill gaps.",
          "matched_skills": ["Skill A", "Skill B"],
          "missing_skills": ["Skill C"],
          "recommendations": ["Recommendation 1", "Recommendation 2"]
        }
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3, // Lower temperature for more consistent scoring
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("JD Match Error:", error);
        res.status(500).json({ error: "Failed to analyze Job Description" });
    }
});

// ==============================
// 🚀 START SERVER
// ==============================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});