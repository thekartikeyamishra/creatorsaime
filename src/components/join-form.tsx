"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  BRAND_INDUSTRIES,
  BRAND_OBJECTIVES,
  CREATOR_CATEGORIES,
  LANGUAGES,
  PROFESSIONAL_SKILLS,
  REFERRAL_SOURCES,
  ROLES,
  site,
  type Role,
} from "@/lib/config";
import type { Preview } from "@/lib/readiness";
import { api, ApiClientError } from "@/lib/client/api";
import { useLocale } from "./locale-provider";
import { Badge, Button, Card, Field, Input, Notice, Select, Textarea, cx } from "./ui";

type Result = { status: "created" | "already_registered"; referralCode: string | null; preview: Preview };

export function JoinForm() {
  const params = useSearchParams();
  const { t } = useLocale();
  const initialRole = (ROLES as readonly string[]).includes(params.get("role") ?? "") ? (params.get("role") as Role) : "creator";
  const ref = (params.get("ref") ?? "").toUpperCase().slice(0, 8);

  const [role, setRole] = useState<Role>(initialRole);
  const [languages, setLanguages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const categories = useMemo(
    () => (role === "creator" ? CREATOR_CATEGORIES : role === "professional" ? PROFESSIONAL_SKILLS : BRAND_INDUSTRIES),
    [role],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const body = {
        name: get("name"),
        email: get("email"),
        city: get("city"),
        role,
        category: get("category"),
        objective: role === "brand" ? get("objective") || undefined : undefined,
        link: get("link"),
        languages,
        challenges: get("challenges"),
        wants: get("wants"),
        referralSource: get("referralSource") || undefined,
        ref: /^[0-9A-HJKMNP-TV-Z]{8}$/.test(ref) ? ref : "",
        marketingConsent: fd.get("marketingConsent") === "on",
        termsAccepted: fd.get("termsAccepted") === "on",
        company_fax: get("company_fax"),
      };
      const res = await api<Result>("/api/waitlist", { body, auth: false });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <PreviewResult result={result} />;

  const e = (k: string) => errors[k];
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]) || undefined, "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset>
        <legend className="text-sm font-medium">{t("join.iAm")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup">
          {ROLES.map((r) => (
            <button
              type="button"
              role="radio"
              aria-checked={role === r}
              key={r}
              onClick={() => setRole(r)}
              className={cx(
                "rounded-2xl px-4 py-4 text-left ring-1 transition",
                role === r ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-slate-300",
              )}
            >
              <span className="block font-semibold">{t(`join.${r}`)}</span>
              <span className={cx("mt-1 block text-xs", role === r ? "text-slate-300" : "text-muted")}>{t(`join.${r}Sub`)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t(role === "brand" ? "join.yourName" : "join.name")} htmlFor="name" error={e("name")}>
            <Input id="name" name="name" autoComplete="name" required maxLength={80} {...a11y("name")} />
          </Field>
          <Field label={t("join.email")} htmlFor="email" error={e("email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} {...a11y("email")} />
          </Field>
          <Field label={t("join.city")} htmlFor="city" error={e("city")}>
            <Input id="city" name="city" autoComplete="address-level2" required maxLength={60} placeholder={t("join.cityPh")} {...a11y("city")} />
          </Field>
          <Field label={t(role === "brand" ? "join.industry" : role === "professional" ? "join.skill" : "join.category")} htmlFor="category" error={e("category")}>
            <Select key={role} id="category" name="category" required options={categories} placeholder={t("join.select")} defaultValue="" {...a11y("category")} />
          </Field>
          {role === "brand" && (
            <Field label={t("join.objective")} htmlFor="objective" error={e("objective")}>
              <Select id="objective" name="objective" required options={BRAND_OBJECTIVES} placeholder={t("join.select")} defaultValue="" {...a11y("objective")} />
            </Field>
          )}
          <Field
            label={t(role === "brand" ? "join.linkBrand" : "join.linkCreator")}
            htmlFor="link"
            error={e("link")}
            optional={role === "brand"}
            hint={role === "brand" ? undefined : t("join.linkHint")}
          >
            <Input id="link" name="link" type="url" inputMode="url" maxLength={300} placeholder="https://instagram.com/yourname" {...a11y("link")} />
          </Field>
        </div>

        {role !== "brand" && (
          <fieldset>
            <legend className="text-sm font-medium">
              {t("join.languages")} <span className="font-normal text-muted">{t("join.upTo5")}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const on = languages.includes(l);
                return (
                  <button
                    type="button"
                    key={l}
                    aria-pressed={on}
                    onClick={() => setLanguages((cur) => (on ? cur.filter((x) => x !== l) : cur.length < 5 ? [...cur, l] : cur))}
                    className={cx("rounded-full px-3 py-1.5 text-sm ring-1 transition", on ? "bg-brand text-white ring-brand" : "bg-white ring-line hover:ring-slate-300")}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      </Card>

      <Card className="space-y-5">
        <Field label={t(role === "brand" ? "join.challengeBrand" : "join.challenge")} htmlFor="challenges" error={e("challenges")} optional>
          <Textarea id="challenges" name="challenges" maxLength={600} {...a11y("challenges")} />
        </Field>
        <Field label={t("join.wants")} htmlFor="wants" error={e("wants")} optional>
          <Textarea id="wants" name="wants" maxLength={600} {...a11y("wants")} />
        </Field>
        <Field label={t("join.source")} htmlFor="referralSource" error={e("referralSource")} optional>
          <Select id="referralSource" name="referralSource" options={REFERRAL_SOURCES} placeholder={t("join.select")} defaultValue="" />
        </Field>
        {ref && (
          <p className="text-sm text-muted">
            Invited with referral code <span className="font-mono font-medium text-ink">{ref}</span>
          </p>
        )}
      </Card>

      {/* Honeypot: hidden from humans and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company_fax">Leave this empty</label>
        <input id="company_fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="termsAccepted" required className="mt-0.5 size-4 rounded border-line text-brand" />
          <span>
            {t("join.terms")} (<Link href="/terms" className="font-medium text-brand hover:underline" target="_blank">Terms</Link> ·{" "}
            <Link href="/privacy" className="font-medium text-brand hover:underline" target="_blank">Privacy</Link>)
          </span>
        </label>
        {e("termsAccepted") && <p className="text-xs font-medium text-red-600" role="alert">{e("termsAccepted")}</p>}
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="marketingConsent" className="mt-0.5 size-4 rounded border-line text-brand" />
          <span>{t("join.marketing")}</span>
        </label>
      </div>

      {formError && <Notice tone="error">{formError}</Notice>}

      <Button type="submit" loading={submitting} className="w-full !py-3 text-base sm:w-auto sm:!px-8">
        {t("join.submit")}
      </Button>
    </form>
  );
}

function PreviewResult({ result }: { result: Result }) {
  const { preview } = result;
  const [copied, setCopied] = useState(false);
  const link = result.referralCode ? `${site.url}/join?ref=${result.referralCode}` : null;

  async function share() {
    if (!link) return;
    const text = "I just requested an invite to CreatorsAI — a verified network for creators and brands. Join me:";
    if (navigator.share) {
      try {
        await navigator.share({ title: "CreatorsAI", text, url: link });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="space-y-6" aria-live="polite">
      {result.status === "already_registered" ? (
        <Notice tone="info">You&apos;re already on the list with this email — no need to sign up again. We review requests personally and will email your invite.</Notice>
      ) : (
        <Notice tone="success">You&apos;re on the list. We review every request personally and will email your invite.</Notice>
      )}

      <Card className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{preview.headline}</h2>
          {preview.inCohortCity && <Badge tone="teal">First-cohort city</Badge>}
        </div>

        {preview.kind === "brand" ? (
          <>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Suggested Creator Pod for your goal</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {preview.suggestedPod.map((m) => (
                  <li key={m.role} className="rounded-xl bg-paper p-4 ring-1 ring-line">
                    <p className="font-medium">{m.role}</p>
                    <p className="mt-1 text-sm text-muted">{m.why}</p>
                  </li>
                ))}
              </ul>
            </div>
            <List title="What you'll get" items={preview.whatYouGet} />
          </>
        ) : (
          <List title="Your strengths" items={preview.strengths} />
        )}
        <List title="Your next steps" items={preview.nextSteps} />
        <p className="rounded-xl bg-paper p-4 text-sm text-muted ring-1 ring-line">{preview.honestStatus}</p>
      </Card>

      {link && (
        <Card className="space-y-3">
          <h3 className="font-semibold">Bring your people</h3>
          <p className="text-sm text-muted">Creators and businesses you refer who get approved are counted on your request. We value quality over volume.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={link} aria-label="Your referral link" onFocus={(ev) => ev.currentTarget.select()} />
            <Button type="button" variant="secondary" onClick={share}>{copied ? "Copied!" : "Share link"}</Button>
            <a
              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              href={`https://wa.me/?text=${encodeURIComponent(`Join me on CreatorsAI: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
