import { useState } from "react";
import { PageHeader, Icon, FormSheet, Field, inputCls, ListSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useEmployees, useCreateEmployee, useUpdateEmployee, type Employee } from "@/hooks/use-employees";
import { useOutlets } from "@/hooks/use-outlets";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manager", cashier: "Kasir" };
const ROLE_COLOR: Record<string, string> = {
  owner: "bg-primary-container text-on-primary-container",
  manager: "bg-secondary-fixed text-on-secondary-fixed-variant",
  cashier: "bg-surface-container text-on-surface-variant",
};

type Sheet = null | "create" | Employee;

export function EmployeesPage(): JSX.Element {
  const { data: employees, isLoading, isError, error } = useEmployees();
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <>
      <PageHeader title="Karyawan" leftIcon="arrow_back" onLeft={() => window.history.back()} rightIcon="person_add" onRight={() => setSheet("create")} />
      <div className="px-container-padding pb-24">
        {isLoading && <ListSkeleton />}
        {isError && <ErrorState message={error instanceof Error ? error.message : "Gagal memuat"} />}
        {!isLoading && !isError && (employees ?? []).length === 0 && (
          <EmptyState icon="group" title="Belum ada karyawan" subtitle="Tambah karyawan dengan tombol + di atas." />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(employees ?? []).map((emp) => (
          <button key={emp.id} onClick={() => setSheet(emp)}
            className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-card border border-outline-variant/40 text-left active:scale-[0.98] transition-transform">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface">{emp.fullName}</h3>
                  {!emp.isActive && <span className="text-[10px] bg-error-container text-on-error-container px-1.5 py-0.5 rounded">Nonaktif</span>}
                </div>
                <p className="font-label-caps text-label-caps text-on-surface-variant mt-0.5">{emp.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${ROLE_COLOR[emp.role] ?? ""}`}>
                    {ROLE_LABEL[emp.role] ?? emp.role}
                  </span>
                  {emp.outlet && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant flex items-center gap-1">
                      <Icon name="store" className="text-[12px]" />{emp.outlet.name}
                    </span>
                  )}
                </div>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant opacity-50 mt-1" />
            </div>
          </button>
        ))}
        </div>
      </div>
      {sheet === "create" && <EmployeeCreateSheet onClose={() => setSheet(null)} />}
      {sheet && sheet !== "create" && <EmployeeEditSheet employee={sheet as Employee} onClose={() => setSheet(null)} />}
    </>
  );
}

function EmployeeCreateSheet({ onClose }: { onClose: () => void }): JSX.Element {
  const create = useCreateEmployee();
  const { data: outlets } = useOutlets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("cashier");
  const [outletId, setOutletId] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    try {
      await create.mutateAsync({ fullName, email, password, role, outletId: outletId || null });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah karyawan");
    }
  }

  const valid = fullName.trim() && email.trim() && password.length >= 6;

  return (
    <FormSheet title="Tambah Karyawan" onClose={onClose}>
      <Field label="Nama Lengkap" required>
        <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama karyawan" autoFocus />
      </Field>
      <Field label="Email" required>
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
      </Field>
      <Field label="Password" required>
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 karakter" />
      </Field>
      <Field label="Role">
        <select className="w-full h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="cashier">Kasir</option>
          <option value="manager">Manager</option>
        </select>
      </Field>
      <Field label="Outlet">
        <select className="w-full h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
          <option value="">— Belum ditentukan —</option>
          {(outlets ?? []).filter((o) => o.isActive).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </Field>
      {err && (
        <div className="bg-error-container/40 border border-error/30 rounded-xl p-3 flex items-start gap-2">
          <Icon name="error" className="text-error text-[18px] mt-0.5 shrink-0" />
          <p className="font-body-md text-body-md text-on-error-container">{err}</p>
        </div>
      )}
      <button onClick={submit} disabled={create.isPending || !valid}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {create.isPending ? "Menyimpan..." : "Tambah Karyawan"}
      </button>
    </FormSheet>
  );
}

function EmployeeEditSheet({ employee, onClose }: { employee: Employee; onClose: () => void }): JSX.Element {
  const update = useUpdateEmployee();
  const { data: outlets } = useOutlets();
  const [role, setRole] = useState(employee.role);
  const [outletId, setOutletId] = useState(employee.outletId ?? "");
  const [isActive, setIsActive] = useState(employee.isActive);

  async function submit() {
    await update.mutateAsync({
      id: employee.id,
      role,
      outletId: outletId || null,
      isActive,
    });
    onClose();
  }

  const isOwner = employee.role === "owner";

  return (
    <FormSheet title={`Edit ${employee.fullName}`} onClose={onClose}>
      <Field label="Role">
        <select
          className="w-full h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface"
          value={role}
          onChange={(e) => setRole(e.target.value as Employee["role"])}
          disabled={isOwner}
        >
          <option value="cashier">Kasir</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
      </Field>
      <Field label="Outlet">
        <select
          className="w-full h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface"
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
        >
          <option value="">— Semua Outlet —</option>
          {(outlets ?? []).filter((o) => o.isActive).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Kasir/Manager hanya bisa akses outlet yang dipilih.</p>
      </Field>
      <Field label="Status">
        <button onClick={() => setIsActive(!isActive)} disabled={isOwner}
          className="flex items-center gap-3 w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
          <Icon name={isActive ? "toggle_on" : "toggle_off"} className={`text-[28px] ${isActive ? "text-primary" : "text-on-surface-variant"}`} />
          <span className="font-body-md text-body-md text-on-surface">{isActive ? "Aktif" : "Nonaktif"}</span>
        </button>
      </Field>
      <button onClick={submit} disabled={update.isPending}
        className="w-full bg-primary text-on-primary rounded-xl h-14 font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
        {update.isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </FormSheet>
  );
}
