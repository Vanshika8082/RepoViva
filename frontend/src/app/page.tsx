import { Navbar } from "@/components/layout/navbar";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="container-page flex min-h-[calc(100vh-4rem)] items-center py-20">
          <div className="max-w-3xl">
            <p className="mb-6 text-sm font-medium tracking-wide text-violet-400">
              AI-POWERED TECHNICAL INTERVIEWS
            </p>

            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Your code.
              <br />
              Your interview.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400">
              RepoViva turns your GitHub project into a realistic technical
              interview built around the code you actually wrote.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="/start"
                className="inline-flex h-11 items-center justify-center rounded-md bg-violet-500 px-6 text-sm font-medium text-white transition-colors hover:bg-violet-400"
              >
                Start an interview
              </a>

              <a
                href="#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.02] px-6 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}