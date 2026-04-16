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

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://api.groq.com http://localhost:3000 https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;"
    );
    next();
});

const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});

// ✅ UPDATED RESUME SCORER: Range 75-100, No Decimals
app.post("/api/resume-score", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    try {
        const { resumeText } = req.body;
        if (!resumeText) return res.status(400).json({ error: "No resume text provided" });

        const prompt = `Analyze this resume as an ATS engine. 
        Return ONLY a JSON object. 
        The "score" MUST be a whole integer between 75 and 100 based on keyword density and formatting. 
        NO DECIMAL VALUES.
        JSON Format: {"score": number, "summary": "string", "strengths": [], "missing_keywords": [], "suggestions": []}. 
        Resume: ${resumeText}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        res.json(JSON.parse(data.choices[0].message.content));
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// ✅ UPDATED JD MATCH API: Range 60-100, No Decimals
app.post("/api/jd-match", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    try {
        const { profile, jdText } = req.body;
        const prompt = `Match this candidate profile to the Job Description. 
        Return ONLY a JSON object. 
        The "match_score" MUST be a whole integer between 60 and 100. 
        NO DECIMAL VALUES.
        JSON Format: {"match_score": number, "verdict": "string", "matched_skills": [], "missing_skills": [], "recommendations": []}. 
        Profile: ${JSON.stringify(profile)} 
        JD: ${jdText}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        res.json(JSON.parse(data.choices[0].message.content));
    } catch (error) {
        res.status(500).json({ error: "JD Match Failed" });
    }
});

app.post("/api/interview-prep", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    try {
        const payload = req.body;
        const prompt = `Generate interview prep. Return JSON: {"repeated_questions": [{"question": "string", "answer": "string"}], "company_insight": "string", "what_they_look_for": [], "tips": [], "confidence_advice": "string"}. Role: ${payload.role} at ${payload.company}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        res.json(JSON.parse(data.choices[0].message.content));
    } catch (error) {
        res.status(500).json({ error: "Interview Prep Failed" });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 HireSense Server running on http://localhost:${PORT}`);
});