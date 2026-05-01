import { Sidebar } from "@/components/layout/sidebar";
import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { FolderKanban, Users, CheckSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <Sidebar>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">Manage and view your team's projects.</p>
          </div>
          <CreateProjectDialog />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full flex flex-col hover-elevate">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground capitalize">
                          {project.myRole}
                        </span>
                      </div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                        {project.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-4 space-y-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>{project.memberCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4" />
                          <span>{project.completedTaskCount} / {project.taskCount}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground mt-1 mb-6">You aren't a member of any projects yet.</p>
            <CreateProjectDialog />
          </div>
        )}
      </div>
    </Sidebar>
  );
}
