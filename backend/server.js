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

// ✅ FIX: Standardized pathing to look into the 'frontend' folder correctly
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// ROUTES
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});

// ✅ RESUME SCORER API
app.post("/api/resume-score", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    try {
        const { resumeText } = req.body;
        if (!resumeText) return res.status(400).json({ error: "No resume text provided" });

        const prompt = `Analyze resume. Return ONLY JSON: {"score": number, "summary": "string", "strengths": [], "missing_keywords": [], "suggestions": []}. Resume: ${resumeText}`;

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

// ✅ JD MATCH API
app.post("/api/jd-match", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    try {
        const { profile, jdText } = req.body;
        const prompt = `Match profile to JD. Return ONLY JSON: {"match_score": number, "verdict": "string", "matched_skills": [], "missing_skills": [], "recommendations": []}. Profile: ${JSON.stringify(profile)} JD: ${jdText}`;

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

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});