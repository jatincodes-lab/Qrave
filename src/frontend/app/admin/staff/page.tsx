"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  RefreshCw,
  Save,
  ShieldCheck,
  UserCog,
  UserPlus,
  X
} from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../components/ui/toast";
import { createStaffUser, getStaffUsers, resetStaffPassword, updateStaffUser, type BranchListItem, type StaffRoleCode, type StaffUser } from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { getCurrentRoleCode } from "../../../lib/auth";
import { firstInvalid, validateEmail, validatePassword, validateRequired } from "../../../lib/validation";

type StaffForm = {
  branchId: string;
  email: string;
  displayName: string;
  password: string;
  roleCode: StaffRoleCode;
};

type StaffDraft = {
  branchId: string;
  displayName: string;
  isActive: boolean;
  roleCode: StaffRoleCode;
};

type ToggleTarget = {
  nextIsActive: boolean;
  user: StaffUser;
};

const DefaultForm: StaffForm = {
  branchId: "",
  email: "",
  displayName: "",
  password: "",
  roleCode: "kitchen"
};

const PageSizeOptions = [5, 10, 20, 50];

const RoleOptions: Array<{ value: StaffRoleCode; label: string; helper: string }> = [
  { value: "manager", label: "Manager", helper: "Menu, orders, customers, reports" },
  { value: "admin", label: "Admin", helper: "Operations access except staff settings" },
  { value: "kitchen", label: "Kitchen", helper: "Kitchen and order boards" },
  { value: "waiter", label: "Waiter", helper: "Orders, waiter calls, branch controls" },
  { value: "staff", label: "Staff", helper: "Basic order operations" }
];

export default function AdminStaffPage() {
  const workspace = useAdminWorkspace();
  const { toastSuccess } = useToast();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const roleCode = getCurrentRoleCode();
  const isOwner = roleCode === "owner";
  const branchName = workspace.selectedBranch?.name ?? "Staff";
  const defaultBranchId = workspace.selectedBranchId || workspace.activeBranches[0]?.branchId || "";
  const totalPages = Math.max(1, Math.ceil(staffUsers.length / pageSize));

  const pagedUsers = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return staffUsers.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, staffUsers, totalPages]);

  useEffect(() => {
    if (isOwner) {
      void loadStaff();
    }
  }, [isOwner]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function loadStaff() {
    setIsLoadingStaff(true);
    try {
      setStaffUsers(await getStaffUsers(true));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingStaff(false);
    }
  }

  async function createStaff(form: StaffForm): Promise<boolean> {
    const validation = firstInvalid(
      validateRequired(form.displayName, "Display name", 160),
      validateEmail(form.email),
      validatePassword(form.password)
    );

    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return false;
    }

    try {
      const created = await createStaffUser({
        branchId: form.branchId || null,
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
        roleCode: form.roleCode
      });
      setStaffUsers((current) => [created, ...current]);
      setPage(1);
      toastSuccess("Staff user created.");
      return true;
    } catch (caught) {
      workspace.handleApiError(caught);
      return false;
    }
  }

  async function saveStaff(user: StaffUser, draft: StaffDraft, password: string): Promise<boolean> {
    if (user.roleCode === "owner") {
      return false;
    }

    const trimmedPassword = password.trim();
    const validation = firstInvalid(
      validateRequired(draft.displayName, "Display name", 160),
      trimmedPassword.length > 0 ? validatePassword(trimmedPassword) : { isValid: true, message: null }
    );

    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return false;
    }

    const hasProfileChanges =
      draft.branchId !== (user.branchId ?? "") ||
      draft.displayName.trim() !== user.displayName ||
      draft.isActive !== user.isActive ||
      draft.roleCode !== user.roleCode;
    const hasPasswordChange = trimmedPassword.length > 0;

    if (!hasProfileChanges && !hasPasswordChange) {
      workspace.setWorkspaceError("No staff changes to save.");
      return false;
    }

    try {
      let updated = user;

      if (hasProfileChanges) {
        updated = await updateStaffUser(user.userId, {
          branchId: draft.branchId || null,
          displayName: draft.displayName.trim(),
          isActive: draft.isActive,
          roleCode: draft.roleCode
        });
      }

      if (hasPasswordChange) {
        updated = await resetStaffPassword(user.userId, { password: trimmedPassword });
      }

      setStaffUsers((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
      toastSuccess(hasPasswordChange && hasProfileChanges ? "Staff user updated and password reset." : hasPasswordChange ? "Staff password reset." : "Staff user updated.");
      return true;
    } catch (caught) {
      workspace.handleApiError(caught);
      return false;
    }
  }

  async function toggleStaff(user: StaffUser, nextIsActive: boolean): Promise<boolean> {
    if (user.roleCode === "owner") {
      return false;
    }

    if (user.isActive === nextIsActive) {
      setToggleTarget(null);
      return true;
    }

    try {
      const updated = await updateStaffUser(user.userId, {
        branchId: user.branchId,
        displayName: user.displayName,
        isActive: nextIsActive,
        roleCode: editableRole(user.roleCode)
      });
      setStaffUsers((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
      toastSuccess(updated.isActive ? "Staff user activated." : "Staff user turned off.");
      return true;
    } catch (caught) {
      workspace.handleApiError(caught);
      return false;
    }
  }

  const showingFrom = staffUsers.length === 0 ? 0 : (Math.min(page, totalPages) - 1) * pageSize + 1;
  const showingTo = Math.min(staffUsers.length, showingFrom + pagedUsers.length - 1);

  return (
    <AdminShell
      active="staff"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <UserCog size={14} />
              Staff
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Staff access</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Create separate logins for managers, kitchen staff, and waiters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadStaff} disabled={isLoadingStaff || !isOwner}>
              {isLoadingStaff ? <RefreshCw size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              Refresh
            </Button>
            <Button type="button" onClick={() => setIsAddDialogOpen(true)} disabled={!isOwner || workspace.isLoadingBranches}>
              <UserPlus size={17} />
              Add staff
            </Button>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {!isOwner ? (
          <div className="rounded-xl border border-outline-variant/70 bg-white p-8 text-center">
            <ShieldCheck size={30} className="mx-auto text-on-surface-variant" />
            <p className="mt-3 font-extrabold text-on-surface">Owner access required</p>
            <p className="mt-1 text-sm text-on-surface-variant">Only owner accounts can create or update staff users.</p>
          </div>
        ) : workspace.isLoadingBranches ? (
          <PageLoading />
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-title-lg font-black text-on-surface">Users</h2>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                  {staffUsers.length} user{staffUsers.length === 1 ? "" : "s"} in this workspace
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                Rows
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none"
                >
                  {PageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isLoadingStaff ? (
              <PageLoading />
            ) : (
              <>
                <StaffTable
                  branches={workspace.activeBranches}
                  onEdit={setEditingUser}
                  onToggle={(user) => setToggleTarget({ user, nextIsActive: !user.isActive })}
                  users={pagedUsers}
                />
                <PaginationControls
                  page={page}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  totalItems={staffUsers.length}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </section>
        )}
      </div>

      {isAddDialogOpen ? (
        <AddStaffDialog
          branches={workspace.activeBranches}
          defaultBranchId={defaultBranchId}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={createStaff}
        />
      ) : null}

      {editingUser ? (
        <EditStaffDialog
          branches={workspace.activeBranches}
          onClose={() => setEditingUser(null)}
          onSubmit={saveStaff}
          user={editingUser}
        />
      ) : null}

      {toggleTarget ? (
        <ToggleStaffDialog
          target={toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={async () => {
            const success = await toggleStaff(toggleTarget.user, toggleTarget.nextIsActive);
            if (success) {
              setToggleTarget(null);
            }
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function StaffTable({
  branches,
  onEdit,
  onToggle,
  users
}: {
  branches: BranchListItem[];
  onEdit: (user: StaffUser) => void;
  onToggle: (user: StaffUser) => void;
  users: StaffUser[];
}) {
  if (users.length === 0) {
    return <div className="rounded-xl border border-dashed border-outline-variant/70 p-8 text-center text-sm font-semibold text-on-surface-variant">No staff users yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/70 bg-white">
      <div className="hidden grid-cols-[1.1fr_0.65fr_0.85fr_0.45fr_0.9fr] gap-4 border-b border-outline-variant/70 bg-surface-container-low px-4 py-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant xl:grid">
        <span>User</span>
        <span>Role</span>
        <span>Branch</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-outline-variant/70">
        {users.map((user) => (
          <StaffRow branches={branches} key={user.userId} onEdit={onEdit} onToggle={onToggle} user={user} />
        ))}
      </div>
    </div>
  );
}

function StaffRow({
  branches,
  onEdit,
  onToggle,
  user
}: {
  branches: BranchListItem[];
  onEdit: (user: StaffUser) => void;
  onToggle: (user: StaffUser) => void;
  user: StaffUser;
}) {
  const isOwner = user.roleCode === "owner";
  const branchName = user.branchName || branches.find((branch) => branch.branchId === user.branchId)?.name || "All branches";
  const isActive = user.isActive && user.tenantUserIsActive;

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.1fr_0.65fr_0.85fr_0.45fr_0.9fr] xl:items-center">
      <div className="min-w-0">
        <p className="truncate font-extrabold text-on-surface">{user.displayName}</p>
        <p className="mt-1 truncate text-sm text-on-surface-variant">{user.email}</p>
      </div>

      <div className="flex items-center gap-2 xl:block">
        <MobileLabel>Role</MobileLabel>
        <Badge variant={isOwner ? "secondary" : "outline"} className="w-fit">
          {roleLabel(user.roleCode)}
        </Badge>
      </div>

      <div className="flex min-w-0 items-center gap-2 xl:block">
        <MobileLabel>Branch</MobileLabel>
        <p className="truncate text-sm font-semibold text-on-surface">{isOwner ? "All branches" : branchName}</p>
      </div>

      <div className="flex items-center gap-2 xl:block">
        <MobileLabel>Status</MobileLabel>
        <Badge variant={isActive ? "success" : "outline"} className="w-fit">
          {isActive ? "Active" : "Off"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isOwner} onClick={() => onEdit(user)}>
          <Pencil size={15} />
          Edit
        </Button>
        <Button
          type="button"
          variant={user.isActive ? "outline" : "secondary"}
          size="sm"
          disabled={isOwner}
          onClick={() => onToggle(user)}
          className={user.isActive ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
        >
          <Power size={15} />
          {user.isActive ? "Turn off" : "Turn on"}
        </Button>
      </div>
    </div>
  );
}

function AddStaffDialog({
  branches,
  defaultBranchId,
  onClose,
  onSubmit
}: {
  branches: BranchListItem[];
  defaultBranchId: string;
  onClose: () => void;
  onSubmit: (form: StaffForm) => Promise<boolean>;
}) {
  const [form, setForm] = useState<StaffForm>({ ...DefaultForm, branchId: defaultBranchId });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(form);
      if (success) {
        setForm({ ...DefaultForm, branchId: defaultBranchId });
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="add-staff-title" className="max-w-2xl p-0">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="border-b border-outline-variant/70 p-5">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle id="add-staff-title" className="text-xl font-black text-on-surface">
                    Add staff
                  </DialogTitle>
                  <DialogDescription>Create a login for a staff member.</DialogDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Close add staff dialog" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </DialogHeader>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                autoComplete="off"
                placeholder="Staff member name"
              />
            </Field>
            <Field label="Email">
              <Input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                type="email"
                autoComplete="off"
                placeholder="staff@example.com"
              />
            </Field>
            <Field label="Password">
              <Input
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                type="password"
                autoComplete="new-password"
                placeholder="Create staff password"
              />
            </Field>
            <Field label="Role">
              <RoleSelect value={form.roleCode} onChange={(roleCode) => setForm({ ...form, roleCode })} />
            </Field>
            <Field label="Assigned branch" className="sm:col-span-2">
              <BranchSelect branches={branches} value={form.branchId} onChange={(branchId) => setForm({ ...form, branchId })} />
            </Field>
            <p className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant sm:col-span-2">
              {RoleOptions.find((role) => role.value === form.roleCode)?.helper}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/70 p-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <UserPlus size={17} />}
              Add staff
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({
  branches,
  onClose,
  onSubmit,
  user
}: {
  branches: BranchListItem[];
  onClose: () => void;
  onSubmit: (user: StaffUser, draft: StaffDraft, password: string) => Promise<boolean>;
  user: StaffUser;
}) {
  const [draft, setDraft] = useState<StaffDraft>(() => ({
    branchId: user.branchId ?? "",
    displayName: user.displayName,
    isActive: user.isActive,
    roleCode: editableRole(user.roleCode)
  }));
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges =
    draft.branchId !== (user.branchId ?? "") ||
    draft.displayName.trim() !== user.displayName ||
    draft.isActive !== user.isActive ||
    draft.roleCode !== user.roleCode ||
    password.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !hasChanges) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(user, draft, password);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="edit-staff-title" className="max-w-2xl p-0">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="border-b border-outline-variant/70 p-5">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle id="edit-staff-title" className="truncate text-xl font-black text-on-surface">
                    Edit staff
                  </DialogTitle>
                  <DialogDescription className="truncate">{user.email}</DialogDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Close edit staff dialog" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </DialogHeader>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Name">
              <Input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} autoComplete="off" />
            </Field>
            <Field label="Email">
              <Input value={user.email} disabled readOnly />
            </Field>
            <Field label="Role">
              <RoleSelect value={draft.roleCode} onChange={(roleCode) => setDraft({ ...draft, roleCode })} />
            </Field>
            <Field label="Status">
              <select
                value={draft.isActive ? "active" : "off"}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.value === "active" })}
                className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none"
              >
                <option value="active">Active</option>
                <option value="off">Off</option>
              </select>
            </Field>
            <Field label="Assigned branch" className="sm:col-span-2">
              <BranchSelect branches={branches} value={draft.branchId} onChange={(branchId) => setDraft({ ...draft, branchId })} />
            </Field>
            <Field label="New password" className="sm:col-span-2">
              <Input
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Leave blank to keep current password"
                type="password"
                value={password}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/70 p-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <Save size={17} />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleStaffDialog({
  onClose,
  onConfirm,
  target
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  target: ToggleTarget;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTurningOff = !target.nextIsActive;

  async function handleConfirm() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="toggle-staff-title" className="max-w-md p-0">
        <div className="p-5">
          <DialogHeader>
            <DialogTitle id="toggle-staff-title" className={isTurningOff ? "text-destructive" : "text-on-surface"}>
              {isTurningOff ? "Turn off this user?" : "Turn on this user?"}
            </DialogTitle>
            <DialogDescription>
              {isTurningOff
                ? `${target.user.displayName} will no longer be able to access the admin panel. You can turn this user back on later.`
                : `${target.user.displayName} will be able to access the admin panel again.`}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/70 p-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant={isTurningOff ? "destructive" : "default"} onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <Power size={17} />}
            {isTurningOff ? "Turn off" : "Turn on"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaginationControls({
  onPageChange,
  page,
  showingFrom,
  showingTo,
  totalItems,
  totalPages
}: {
  onPageChange: (page: number) => void;
  page: number;
  showingFrom: number;
  showingTo: number;
  totalItems: number;
  totalPages: number;
}) {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/70 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-on-surface-variant">
        Showing {showingFrom}-{showingTo} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!canGoBack} onClick={() => onPageChange(Math.max(1, page - 1))}>
          <ChevronLeft size={16} />
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm font-extrabold text-on-surface">
          {page} / {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={!canGoForward} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function Field({
  children,
  className,
  label
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`grid gap-2 ${className ?? ""}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function RoleSelect({
  onChange,
  value
}: {
  onChange: (roleCode: StaffRoleCode) => void;
  value: StaffRoleCode;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as StaffRoleCode)} className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none">
      {RoleOptions.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}

function BranchSelect({
  branches,
  onChange,
  value
}: {
  branches: BranchListItem[];
  onChange: (branchId: string) => void;
  value: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none">
      <option value="">All branches</option>
      {branches.map((branch) => (
        <option key={branch.branchId} value={branch.branchId}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}

function MobileLabel({ children }: { children: ReactNode }) {
  return <span className="w-20 text-xs font-bold uppercase tracking-wide text-on-surface-variant xl:hidden">{children}</span>;
}

function roleLabel(roleCode: StaffUser["roleCode"]) {
  return RoleOptions.find((role) => role.value === roleCode)?.label ?? "Owner";
}

function editableRole(roleCode: StaffUser["roleCode"]): StaffRoleCode {
  return roleCode === "owner" ? "staff" : roleCode;
}
