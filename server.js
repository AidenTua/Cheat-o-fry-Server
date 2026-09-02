require("dotenv").config();

const http = require("http");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const server = http.createServer(async (request, response) => {

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "POST" && request.url === "/ask") {

        let body = "";

        request.on("data", chunk => {
            body += chunk;
        });

        request.on("end", async () => {

            try {
                const data = JSON.parse(body);

                console.log("Prompt received:", data.prompt);

                const interaction = await ai.interactions.create({
                    model: "gemini-3.5-flash-lite",
                    input: data.prompt,

                    generation_config: {
                        thinking_level: "low",
                    },

                    system_instruction: `
                        You are an AI assistant accessed through a discreet earpiece.

                        Give concise, direct answers designed to be spoken aloud.

                        Rules:
                        - Always re-read the question asked.
                        - Get straight to the point.
                        - Keep responses as short as reasonably possible.
                        - Do not use markdown.
                        - Do not use headings or bullet points.
                        - Do not give step-by-step explanations unless explicitly requested.
                        - Do not repeat the user's question.
                        - For simple factual questions, give only the answer.
                        - For calculations, give only the result unless an explanation is requested.
                        - Use natural spoken language.
                        - Be kind.
                        - Never invent or assume facts.
If you are not confident about a factual answer, say that you are not sure rather than guessing.
Pay close attention to the exact names in the user's question and do not substitute similar names.
                    `,
                });

                const answer = interaction.output_text;

                response.setHeader("Content-Type", "application/json");
                console.log("Response: " + answer);
                response.end(JSON.stringify({
                    response: answer
                    
                }));

            } catch (error) {

                console.error(error);

                response.statusCode = 500;

                response.end(JSON.stringify({
                    error: error.message
                }));
            }
        });

        return;
    }

    response.statusCode = 404;
    response.end("Not found");
});

server.listen(3000, () => {
    console.log("Cheat-o-fry server running on http://localhost:3000");
});