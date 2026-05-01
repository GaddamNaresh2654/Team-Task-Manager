import { useParams, Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TaskCard } from "@/components/tasks/task-card";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import {
  useGetProject,
  useListProjectTasks,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Users, CheckSquare, Kanban } from "lucide-react";

type TaskStatus = "todo" | "in_progress" | "done";

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "text-slate-600" },
  { key: "in_progress", label: "In Progress", color: "text-blue-600" },
  { key: "done", label: "Done", color: "text-green-600" },
];

export function ProjectDetail() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId ?? "0", 10);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: tasks, isLoading: tasksLoading } = useListProjectTasks(projectId, undefined, {
    query: { enabled: !!projectId },
  });

  const isAdmin = project?.myRole === "admin";

  const tasksByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = (tasks ?? []).filter((t) => t.status === col.key);
      return acc;
    },
    {} as Record<TaskStatus, typeof tasks>,
  );

  return (
    <Sidebar>
      <div className="flex flex-col h-full">
        <div className="border-b px-8 py-4 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="button-back-projects">
                <ArrowLeft className="h-4 w-4" />
                Projects
              </Button>
            </Link>
            <div className="h-5 w-px bg-border" />
            {projectLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{project?.name}</h1>
                {project?.myRole && (
                  <Badge variant="outline" className="capitalize">
                    {project.myRole}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!projectLoading && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mr-4">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{project?.memberCount ?? 0} members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4" />
                  <span>{project?.completedTaskCount ?? 0}/{project?.taskCount ?? 0} done</span>
                </div>
              </div>
            )}
            {isAdmin && (
              <Link href={`/projects/${projectId}/settings`}>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-project-settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {project?.description && (
            <p className="text-muted-foreground text-sm mb-6">{project.description}</p>
          )}

          <div className="flex items-center gap-2 mb-6">
            <Kanban className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Task Board</h2>
          </div>

          <div className="grid grid-cols-3 gap-6 min-h-[400px]">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus[col.key] ?? [];
              return (
                <div key={col.key} className="flex flex-col" data-testid={`column-${col.key}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {tasksLoading ? "..." : colTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 bg-muted/40 rounded-xl p-3 space-y-2 min-h-[200px]">
                    {tasksLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="bg-background border rounded-lg p-3 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      colTasks.map((task) => <TaskCard key={task.id} task={task as any} />)
                    )}
                    <CreateTaskDialog projectId={projectId} defaultStatus={col.key} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
