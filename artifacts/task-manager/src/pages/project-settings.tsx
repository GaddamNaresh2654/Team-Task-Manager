import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sidebar } from "@/components/layout/sidebar";
import {
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useListProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
  useUpdateProjectMember,
  useListUsers,
  getGetProjectQueryKey,
  getListProjectMembersQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, UserPlus, Users } from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

export function ProjectSettings() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member">("member");

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: members, isLoading: membersLoading } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) },
  });
  const { data: allUsers } = useListUsers();

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const updateMember = useUpdateProjectMember();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
    values: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
  });

  const onSave = (values: z.infer<typeof projectSchema>) => {
    updateProject.mutate(
      { projectId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Project updated" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const onDeleteProject = () => {
    deleteProject.mutate(
      { projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setLocation("/projects");
          toast({ title: "Project deleted" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const onAddMember = () => {
    if (!addUserId) return;
    addMember.mutate(
      { projectId, data: { userId: addUserId, role: addRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setAddUserId("");
          toast({ title: "Member added" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const onRemoveMember = (userId: string) => {
    removeMember.mutate(
      { projectId, userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Member removed" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const onChangeRole = (userId: string, role: "admin" | "member") => {
    updateMember.mutate(
      { projectId, userId, data: { role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          toast({ title: "Role updated" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const existingMemberIds = new Set(members?.map((m) => m.userId) ?? []);
  const availableUsers = allUsers?.filter((u) => !existingMemberIds.has(u.id)) ?? [];

  return (
    <Sidebar>
      <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="button-back-project">
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
          <p className="text-muted-foreground mt-1">Manage project details and members.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Update the project name and description.</CardDescription>
          </CardHeader>
          <CardContent>
            {projectLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-project-name" {...field} />
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
                  <Button type="submit" disabled={updateProject.isPending} data-testid="button-save-project">
                    {updateProject.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>Manage who has access to this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {members?.map((member) => {
                  const name =
                    member.user.firstName || member.user.lastName
                      ? `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim()
                      : member.user.email;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 py-2"
                      data-testid={`member-row-${member.userId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {(member.user.firstName?.[0] ?? member.user.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(v) => onChangeRole(member.userId, v as "admin" | "member")}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          onClick={() => onRemoveMember(member.userId)}
                          data-testid={`button-remove-member-${member.userId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Add Member</p>
              <div className="flex gap-2">
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-add-user">
                    <SelectValue placeholder="Select a user to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName || user.lastName
                          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                          : user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addRole} onValueChange={(v) => setAddRole(v as "admin" | "member")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={onAddMember}
                  disabled={!addUserId || addMember.isPending}
                  data-testid="button-add-member"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete this project and all its tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-project">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent. All tasks and member associations will be removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={onDeleteProject}
                    data-testid="button-confirm-delete-project"
                  >
                    Yes, delete it
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}

