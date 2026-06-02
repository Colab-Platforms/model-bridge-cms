import Link from "next/link";

export default function HeroSection() {
  const stats = [
    {
      value: "100T",
      label: "Monthly Tokens",
    },
    {
      value: "8M+",
      label: "Global Users",
    },
    {
      value: "60+",
      label: "Providers",
    },
    {
      value: "400+",
      label: "Models",
      highlight: true,
    },
  ];

  return (
    <section className="min-h-screen bg-white text-black flex items-center justify-center px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-bold leading-tight">
          The Unified Interface
          <br />
          For LLMs
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg md:text-2xl text-gray-400">
          Better{" "}
          <span className="text-indigo-500">prices</span>, better{" "}
          <span className="text-indigo-500">uptime</span>, no subscriptions.
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/login">
            <button className="bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-lg font-semibold transition" >
              Get API Key
            </button>
          </Link>

          <Link href="/models">
            <button className="border border-gray-700 hover:border-gray-500 px-8 py-4 rounded-lg font-semibold transition">
              Explore Models ✨
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-24">
          {stats.map((item) => (
            <div key={item.label}>
              <h3
                className={`text-4xl font-bold ${
                  item.highlight ? "text-indigo-500" : "text-black"
                }`}
              >
                {item.value}
              </h3>
              <p className="mt-2 text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}