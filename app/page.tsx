import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Hello Chatbot</h1>
      <ChatWidget />
    </main>
  );
}