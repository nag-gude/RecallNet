export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p className="max-w-2xl mx-auto px-4">
        RecallNet provides informational recall alerts based on public data and your uploaded
        purchase history. Always verify with the manufacturer and official recall listings before
        taking action. Not legal or medical advice.
      </p>
      <p className="mt-2 text-slate-400">RecallNet · H0 Hackathon · DynamoDB + Vercel</p>
    </footer>
  );
}
