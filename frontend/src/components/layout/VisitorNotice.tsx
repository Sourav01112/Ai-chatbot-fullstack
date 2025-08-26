import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VisitorNotice = () => {
    const [open, setOpen] = useState(true);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Dear Visitor</DialogTitle>
                    <DialogDescription>
                        I’m currently integrating the{" "}
                        <span className="font-medium">Chatbot backend</span> into this
                        application. In the meantime, feel free to explore the UI.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-gray-700 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold mb-1">⚡ Key Features</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Multi-turn conversations with context</li>
                            <li>Hybrid search RAG (Elasticsearch)</li>
                            <li>Real-time WebSocket communication</li>
                            <li>Event-driven async processing</li>
                            <li>Full observability stack</li>
                        </ul>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold mb-1">🛠 Tech Stack</p>
                        <p>
                            <strong>Frontend:</strong> React.js + ts
                            <br />
                            <strong>Services:</strong> Node.js (API-Gateway), Go (Chat + User),
                            Python/FastAPI (AI)
                            <br />
                            <strong>Data:</strong> PostgreSQL, Elasticsearch, Redis, RabbitMQ, Vector DB
                            <br />
                            <strong>AI:</strong> Ollama Models, Langchain
                            <br />

                            <strong>Infra:</strong> Docker, Kubernetes, CI/CD
                        </p>
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <a href="https://github.com/Sourav01112/Ai-chatbot-fullstack" target="_blank" >

                        <Button
                            variant="hero"
                            size="lg"
                            className="glow-effect"
                            onClick={() => setOpen(false)}
                        >
                            Explore GitHub Repo
                        </Button>
                    </a>
                    <Button
                        variant="hero"
                        size="lg"
                        className="glow-effect"
                        onClick={() => setOpen(false)}
                    >
                        Got it
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VisitorNotice;
