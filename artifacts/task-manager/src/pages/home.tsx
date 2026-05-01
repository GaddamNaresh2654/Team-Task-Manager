import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Layout, Users } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">TaskFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="font-medium">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Focus on the work, <br className="hidden sm:inline" />
            <span className="text-primary">not the workflow.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A collaborative team task manager built for software teams. Dense, organized, and out of your way. Track progress, assign work, and hit your deadlines.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/sign-up">
              <Button size="lg" className="font-semibold px-8 h-12 text-base">
                Start for free
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="font-semibold px-8 h-12 text-base">
                Sign in to your team
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 mt-32 max-w-5xl mx-auto text-left">
          <div className="space-y-3">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
              <Layout className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Organized Projects</h3>
            <p className="text-muted-foreground">Keep your team's work neatly organized in dedicated project spaces.</p>
          </div>
          <div className="space-y-3">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Track Progress</h3>
            <p className="text-muted-foreground">Clear visibility into what's to do, in progress, and done.</p>
          </div>
          <div className="space-y-3">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Collaborate</h3>
            <p className="text-muted-foreground">Assign tasks to team members and move forward together.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
