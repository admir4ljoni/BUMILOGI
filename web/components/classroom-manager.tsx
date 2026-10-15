"use client";

import { useRef, useState, type SubmitEvent } from "react";
import { groups, useGroups, type Child, type Group } from "@/lib/groups";

const THIS_YEAR = new Date().getFullYear();
// Children are 4–6 in the target range; allow a little slack either side.
const MIN_BIRTH = THIS_YEAR - 10;
const MAX_BIRTH = THIS_YEAR - 2;

const KIND = {
  class: { label: "Kelas", color: "--yellow" },
  family: { label: "Keluarga", color: "--pink" },
} as const;

function KindIcon({ kind, size = 40 }: { kind: Group["kind"]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flex: "none" }}>
      <rect x={2} y={2} width={36} height={36} rx={11} fill={`var(${KIND[kind].color})`} stroke="var(--ink)" strokeWidth={2} />
      {kind === "class" ? (
        <g fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x={11} y={11} width={18} height={12} rx={2} />
          <path d="M16 29h8M20 23v6" />
        </g>
      ) : (
        <path d="M11 20 20 12l9 8v9H11z" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
      )}
    </svg>
  );
}

const ageOf = (y: number | null) => (y ? `± ${THIS_YEAR - y} tahun` : "—");
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const yearOf = (v: FormDataEntryValue | null) => (clean(v) ? Number(clean(v)) : null);

export function ClassroomManager() {
  const list = useGroups();
  const [selId, setSelId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState<Group | null>(null); // null = creating
  const [editChild, setEditChild] = useState<Child | null>(null);
  const groupDlg = useRef<HTMLDialogElement>(null);
  const childDlg = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLElement>(null);

  if (!list) return <p className="muted">Memuat…</p>;
  const sel = list.find((g) => g.id === selId) ?? list[0] ?? null;

  const openGroup = (g: Group | null) => {
    setEditGroup(g);
    groupDlg.current?.showModal();
  };
  const select = (id: string) => {
    setSelId(id);
    if (innerWidth < 900) requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: "smooth" }));
  };

  function saveGroup(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const kind = f.get("kind") === "family" ? "family" : "class";
    const data = { name: clean(f.get("name")), kind, academic_year: kind === "class" ? clean(f.get("year")) || null : null } as const;
    if (editGroup) groups.update(editGroup.id, data);
    else setSelId(groups.create(data));
    groupDlg.current?.close();
  }

  function addChild(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    groups.addChild(sel!.id, { name: clean(f.get("name")), birth_year: yearOf(f.get("birth_year")) });
    form.reset();
    form.querySelector<HTMLInputElement>("input[name=name]")?.focus(); // ready for the next child
  }

  function saveChild(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    groups.updateChild(sel!.id, editChild!.id, { name: clean(f.get("name")), birth_year: yearOf(f.get("birth_year")) });
    childDlg.current?.close();
  }

  return (
    <>
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Kelas &amp; Keluarga</h1>
          <p className="muted">Kelompokkan anak per kelas atau keluarga untuk mencatat progres misi mereka.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openGroup(null)}>
          + Buat kelompok
        </button>
      </div>

      <p className="form-note preview-note" role="note">
        <span aria-hidden="true">i</span>
        Mode pratinjau: data masih tersimpan di perangkat ini saja dan belum tersinkron ke akunmu.
      </p>

      {list.length === 0 ? (
        <div className="dash-panel empty">
          <KindIcon kind="class" size={56} />
          <h2 className="card-title">Belum ada kelompok</h2>
          <p className="muted">Buat kelas untuk murid TK/PAUD, atau keluarga untuk anak-anak di rumah.</p>
          <button type="button" className="btn btn-primary" onClick={() => openGroup(null)}>
            + Buat kelompok pertama
          </button>
        </div>
      ) : (
        <div className="groups-layout">
          <ul className="group-list" aria-label="Daftar kelompok">
            {list.map((g) => (
              <li key={g.id}>
                <button type="button" className="group-item" aria-current={g.id === sel?.id} onClick={() => select(g.id)}>
                  <KindIcon kind={g.kind} />
                  <span className="group-item-text">
                    <strong>{g.name}</strong>
                    <span className="muted">
                      {KIND[g.kind].label}
                      {g.academic_year && ` · ${g.academic_year}`} · {g.children.length} anak
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {sel && (
            <section ref={detail} className="dash-panel group-detail" aria-labelledby="group-title">
              <div className="group-detail-head">
                <KindIcon kind={sel.kind} size={48} />
                <div className="group-detail-title">
                  <h2 id="group-title" className="card-title">
                    {sel.name}
                  </h2>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {KIND[sel.kind].label}
                    {sel.academic_year && ` · Tahun ajaran ${sel.academic_year}`}
                  </p>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn-ghost" onClick={() => openGroup(sel)}>
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="btn-ghost danger"
                    onClick={() => confirm(`Hapus "${sel.name}" beserta ${sel.children.length} anak di dalamnya?`) && groups.remove(sel.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {sel.children.length === 0 ? (
                <p className="muted empty-row">Belum ada anak di kelompok ini. Tambahkan di bawah.</p>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Tahun lahir</th>
                      <th>
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sel.children.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td className="muted">
                          {c.birth_year ?? "—"} <span className="age">{c.birth_year && `(${ageOf(c.birth_year)})`}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => {
                                setEditChild(c);
                                childDlg.current?.showModal();
                              }}
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              className="btn-ghost danger"
                              onClick={() => confirm(`Hapus ${c.name} dari ${sel.name}?`) && groups.removeChild(sel.id, c.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form className="add-child" onSubmit={addChild}>
                <label className="field">
                  <span className="field-label">Nama anak</span>
                  <input className="input" name="name" required maxLength={80} autoComplete="off" />
                </label>
                <label className="field">
                  <span className="field-label">Tahun lahir</span>
                  <input className="input" name="birth_year" type="number" inputMode="numeric" min={MIN_BIRTH} max={MAX_BIRTH} placeholder={String(THIS_YEAR - 5)} />
                </label>
                <button type="submit" className="btn btn-secondary">
                  + Tambah
                </button>
              </form>
            </section>
          )}
        </div>
      )}

      <dialog ref={groupDlg} className="dash-dialog" aria-labelledby="group-dlg-title">
        {/* key remounts the form so it resets between create and edit */}
        <GroupForm key={editGroup?.id ?? "new"} group={editGroup} onSubmit={saveGroup} onCancel={() => groupDlg.current?.close()} />
      </dialog>

      <dialog ref={childDlg} className="dash-dialog" aria-labelledby="child-dlg-title">
        {editChild && (
          <form key={editChild.id} className="auth-form" onSubmit={saveChild}>
            <h2 id="child-dlg-title" className="card-title">
              Ubah data anak
            </h2>
            <label className="field">
              <span className="field-label">Nama anak</span>
              <input className="input" name="name" required maxLength={80} defaultValue={editChild.name} />
            </label>
            <label className="field">
              <span className="field-label">Tahun lahir</span>
              <input className="input" name="birth_year" type="number" min={MIN_BIRTH} max={MAX_BIRTH} defaultValue={editChild.birth_year ?? ""} />
            </label>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => childDlg.current?.close()}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                Simpan
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

function GroupForm({ group, onSubmit, onCancel }: { group: Group | null; onSubmit: (e: SubmitEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<Group["kind"]>(group?.kind ?? "class");
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2 id="group-dlg-title" className="card-title">
        {group ? "Ubah kelompok" : "Buat kelompok baru"}
      </h2>
      <fieldset className="kind-pick">
        <legend className="field-label">Jenis</legend>
        {(["class", "family"] as const).map((k) => (
          <label key={k} className="kind-option">
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            <KindIcon kind={k} size={32} />
            {KIND[k].label}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="field-label">{kind === "class" ? "Nama kelas" : "Nama keluarga"}</span>
        <input
          className="input"
          name="name"
          required
          maxLength={80}
          defaultValue={group?.name}
          placeholder={kind === "class" ? "TK B Melati" : "Keluarga Budi"}
        />
      </label>
      {kind === "class" && (
        <label className="field">
          <span className="field-label">Tahun ajaran</span>
          <input
            className="input"
            name="year"
            pattern="\d{4}/\d{4}"
            title="Format: 2026/2027"
            defaultValue={group?.academic_year ?? `${THIS_YEAR}/${THIS_YEAR + 1}`}
          />
        </label>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary">
          {group ? "Simpan" : "Buat"}
        </button>
      </div>
    </form>
  );
}
