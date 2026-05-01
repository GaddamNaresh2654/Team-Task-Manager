import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useUpdateTask,
  useDeleteTask,
  useListUsers,
  getListProjectTasksQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMyTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assigneeId?: string | null;
  assignee?: { id: string; email: string; firstName?: string | null; lastName?: string | null } | null;
  dueDate?: string | null;
}

const editSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

const priorityColors = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

function isOverdue(dueDate?: string | null, status?: string) {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date();
}

export function TaskCard({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: users } = useListUsers();
  const overdue = isOverdue(task.dueDate, task.status);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? undefined,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : undefined,
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(task.projectId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
  };

  const onSubmit = (values: z.infer<typeof editSchema>) => {
    updateTask.mutate(
      {
        projectId: task.projectId,
        taskId: task.id,
        data: {
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          toast({ title: "Task updated" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const onDelete = () => {
    deleteTask.mutate(
      { projectId: task.projectId, taskId: task.id },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          toast({ title: "Task deleted" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const assigneeName = task.assignee
    ? (task.assignee.firstName || task.assignee.lastName
        ? `${task.assignee.firstName ?? ""} ${task.assignee.lastName ?? ""}`.trim()
        : task.assignee.email)
    : null;

  return (
    <>
      <div
        data-testid={`task-card-${task.id}`}
        onClick={() => setOpen(true)}
        className={cn(
          "bg-background border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all space-y-2 group",
          overdue && "border-red-200",
        )}
      >
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", priorityColors[task.priority])}>
            {task.priority}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {overdue && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
            {task.dueDate && !overdue && <Clock className="h-3.5 w-3.5" />}
            {task.dueDate && (
              <span className={overdue ? "text-red-500" : ""}>
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
        {assigneeName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{assigneeName}</span>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input data-testid="input-edit-task-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName || user.lastName
                              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                              : user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={deleteTask.isPending}
                  data-testid="button-delete-task"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTask.isPending} data-testid="button-save-task">
                    {updateTask.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
