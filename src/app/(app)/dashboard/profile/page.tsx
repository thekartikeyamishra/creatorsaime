"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ChipSelect } from "@/components/chip-select";
import { Button, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import type { BrandProfile, CreatorProfile } from "@/lib/client/types";
import { BRAND_INDUSTRIES, CREATOR_CATEGORIES, LANGUAGES, PROFESSIONAL_SKILLS } from "@/lib/config";

export default function ProfilePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfileEditor />
    </Suspense>
  );
}

function ProfileEditor() {
  const { me, refreshMe } = useAuth();
  const welcome = useSearchParams().get("welcome") === "1";
  if (!me?.member || !me.profile) return <Notice tone="info">Accept your invite first to create a profile.</Notice>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      {welcome && <Notice tone="success">Welcome to CreatorsAI! Complete your profile, then verify your {me.member.role === "brand" ? "business" : "social accounts"}.</Notice>}
      {me.member.role === "brand" ? (
        <BrandForm profile={me.profile as BrandProfile} onSaved={refreshMe} />
      ) : (
        <CreatorForm profile={me.profile as CreatorProfile} kind={me.member.role} onSaved={refreshMe} />
      )}
    </div>
  );
}

function useSave(onSaved: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function save(body: unknown) {
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/profile", { method: "PUT", body });
      await onSaved();
      setMsg({ tone: "success", text: "Saved." });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setMsg({ tone: "error", text: err.message });
      } else setMsg({ tone: "error", text: "Could not save. Try again." });
    } finally {
      setBusy(false);
    }
  }
  return { busy, errors, msg, save };
}

function CreatorForm({ profile, kind, onSaved }: { profile: CreatorProfile; kind: "creator" | "professional"; onSaved: () => Promise<unknown> }) {
  const { busy, errors, msg, save } = useSave(onSaved);
  const [categories, setCategories] = useState<string[]>(profile.categories);
  const [languages, setLanguages] = useState<string[]>(profile.languages);
  const options = kind === "creator" ? CREATOR_CATEGORIES : PROFESSIONAL_SKILLS;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    void save({
      displayName: s("displayName"),
      handle: s("handle"),
      bio: s("bio"),
      city: s("city"),
      categories,
      languages,
      portfolioLinks: s("portfolioLinks").split(/\s*\n\s*/).map((x) => x.trim()).filter(Boolean),
      rateCardNote: s("rateCardNote"),
      openToPods: fd.get("openToPods") === "on",
      isPublic: fd.get("isPublic") === "on",
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName" error={errors.displayName}>
          <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={80} required />
        </Field>
        <Field label="Handle" htmlFor="handle" error={errors.handle} hint="Your public URL: /p/handle">
          <Input id="handle" name="handle" defaultValue={profile.handle} maxLength={30} required pattern="[a-z0-9-]{3,30}" />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" name="city" defaultValue={profile.city} maxLength={60} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bio" htmlFor="bio" error={errors.bio} hint="What you create, who your audience is, what brands you work best with." optional>
            <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={500} rows={4} />
          </Field>
        </div>
      </Card>
      <Card className="space-y-6">
        <ChipSelect legend={kind === "creator" ? "Categories" : "Skills"} options={options} value={categories} onChange={setCategories} max={4} />
        {errors.categories && <p className="text-xs font-medium text-red-600">{errors.categories}</p>}
        <ChipSelect legend="Content languages" options={LANGUAGES} value={languages} onChange={setLanguages} max={6} />
      </Card>
      <Card className="space-y-5">
        <Field label="Portfolio links" htmlFor="portfolioLinks" error={Object.entries(errors).find(([k]) => k.startsWith("portfolioLinks"))?.[1]} hint="One link per line, up to 6." optional>
          <Textarea id="portfolioLinks" name="portfolioLinks" defaultValue={profile.portfolioLinks.join("\n")} rows={4} />
        </Field>
        <Field label="Rates note" htmlFor="rateCardNote" error={errors.rateCardNote} hint="e.g. 'Reels from ₹3,000. Happy to discuss packages.' Visible on your public page." optional>
          <Textarea id="rateCardNote" name="rateCardNote" defaultValue={profile.rateCardNote} maxLength={300} rows={2} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="openToPods" defaultChecked={profile.openToPods} className="mt-0.5 size-4" />
          <span><strong>Open to Creator Pods</strong> — be considered for team campaigns.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="isPublic" defaultChecked={profile.isPublic} className="mt-0.5 size-4" />
          <span><strong>Make my profile public</strong> — publishes your Trust Passport at /p/{profile.handle}. Your email is never shown.</span>
        </label>
      </Card>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button type="submit" loading={busy}>Save profile</Button>
    </form>
  );
}

function BrandForm({ profile, onSaved }: { profile: BrandProfile; onSaved: () => Promise<unknown> }) {
  const { busy, errors, msg, save } = useSave(onSaved);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    void save({
      displayName: s("displayName"),
      handle: s("handle"),
      bio: s("bio"),
      city: s("city"),
      industry: s("industry"),
      website: s("website"),
      isPublic: fd.get("isPublic") === "on",
    });
  }
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand / business name" htmlFor="displayName" error={errors.displayName}>
          <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={80} required />
        </Field>
        <Field label="Handle" htmlFor="handle" error={errors.handle} hint="Your public URL: /p/handle">
          <Input id="handle" name="handle" defaultValue={profile.handle} maxLength={30} required />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" name="city" defaultValue={profile.city} maxLength={60} required />
        </Field>
        <Field label="Industry" htmlFor="industry" error={errors.industry}>
          <Select id="industry" name="industry" options={BRAND_INDUSTRIES} defaultValue={profile.industry} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Website or social page" htmlFor="website" error={errors.website} optional>
            <Input id="website" name="website" type="url" defaultValue={profile.website} maxLength={300} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="About your business" htmlFor="bio" error={errors.bio} optional>
            <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={500} rows={4} />
          </Field>
        </div>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" name="isPublic" defaultChecked={profile.isPublic} className="mt-0.5 size-4" />
          <span><strong>Make my brand page public</strong> at /p/{profile.handle}.</span>
        </label>
      </Card>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button type="submit" loading={busy}>Save profile</Button>
    </form>
  );
}
