require("dotenv").config();

const http = require("http");
const { GoogleGenAI } = require("@google/genai");
const { tavily } = require("@tavily/core");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

let previousInteractionId = null;

async function searchWeb(query) {
    const result = await tvly.search(query, {
        maxResults: 5,
        searchDepth: "basic"
    });

    return result.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content
    }));
}

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

                console.log("Request received:", data);

                let input = data.prompt;

                if (data.searchWeb) {
                    console.log("Searching web for:", data.prompt);

                    const searchResults = await searchWeb(data.prompt);

                    input = `
The user asked you to search the web.

Here are the web search results:

${searchResults.map((result, index) => `
SOURCE ${index + 1}
Title: ${result.title}
URL: ${result.url}
Content: ${result.content}
`).join("\n")}

Using these sources, answer the user's original question:

${data.prompt}

Only state information supported by the search results.
If the search results do not provide enough information, say so.
`;
                }

                const interaction = await ai.interactions.create({
                    model: "gemini-3.5-flash-lite",
                    input: input,

                    previous_interaction_id: previousInteractionId,

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
                        - If you are asked to summarize something, you may make the response longer.
                        - Never invent or assume facts.
                        - If you are not confident about a factual answer, say that you are not sure rather than guessing.
                        - Pay close attention to the exact names in the user's question and do not substitute similar names.
                    `,
                });

                previousInteractionId = interaction.id;

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

server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log("Cheat-o-fry server running");
});
