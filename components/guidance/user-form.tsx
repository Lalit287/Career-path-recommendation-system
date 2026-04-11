"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Sparkles, Plus } from "lucide-react"
import type { GuidanceFormState } from "./types"

export const EDUCATION_OPTIONS = [
  { value: "High school / Secondary", label: "High school / Secondary" },
  { value: "Associate / Diploma", label: "Associate / Diploma" },
  { value: "Bachelor's degree", label: "Bachelor's degree" },
  { value: "Master's degree", label: "Master's degree" },
  { value: "Doctorate / PhD", label: "Doctorate / PhD" },
  { value: "Self-taught / Bootcamp", label: "Self-taught / Bootcamp" },
] as const

type UserFormProps = {
  form: GuidanceFormState
  interestDraft: string
  onInterestDraftChange: (v: string) => void
  onAddInterestTag: () => void
  onInterestKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onRemoveTag: (tag: string) => void
  onAgeChange: (v: string) => void
  onProfessionChange: (v: string) => void
  onSkillsChange: (v: string) => void
  onEducationChange: (v: string) => void
  onGoalsChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
}

export function UserForm({
  form,
  interestDraft,
  onInterestDraftChange,
  onAddInterestTag,
  onInterestKeyDown,
  onRemoveTag,
  onAgeChange,
  onProfessionChange,
  onSkillsChange,
  onEducationChange,
  onGoalsChange,
  onSubmit,
  disabled,
}: UserFormProps) {
  return (
    <Card className="rounded-2xl border-indigo-100/80 bg-white/90 shadow-lg shadow-indigo-500/5 backdrop-blur dark:border-indigo-900/40 dark:bg-card/95">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-indigo-950 dark:text-indigo-50">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Your profile
        </CardTitle>
        <CardDescription>
          Tell us about your interests and background. We&apos;ll tailor guidance to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guidance-age">Age</Label>
            <Input
              id="guidance-age"
              type="number"
              min={13}
              max={100}
              inputMode="numeric"
              value={form.age}
              onChange={(e) => onAgeChange(e.target.value)}
              placeholder="e.g. 25"
              disabled={disabled}
              className="rounded-xl border-indigo-100 dark:border-indigo-900/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guidance-profession">Current profession/role</Label>
            <Input
              id="guidance-profession"
              value={form.profession}
              onChange={(e) => onProfessionChange(e.target.value)}
              placeholder="e.g. Student, Taxi Driver, Accountant"
              disabled={disabled}
              className="rounded-xl border-indigo-100 dark:border-indigo-900/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidance-interests">Interests</Label>
          <div className="flex gap-2">
            <Input
              id="guidance-interests"
              value={interestDraft}
              onChange={(e) => onInterestDraftChange(e.target.value)}
              onKeyDown={onInterestKeyDown}
              placeholder="Type a topic and press Enter"
              disabled={disabled}
              className="rounded-xl border-indigo-100 dark:border-indigo-900/50"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={onAddInterestTag}
              disabled={disabled || !interestDraft.trim()}
              aria-label="Add interest tag"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.interestTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {form.interestTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 pl-2.5 pr-1 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-100"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="rounded-full p-0.5 hover:bg-indigo-200/80 dark:hover:bg-indigo-800"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidance-skills">Skills (optional)</Label>
          <Input
            id="guidance-skills"
            value={form.skills}
            onChange={(e) => onSkillsChange(e.target.value)}
            placeholder="e.g. Python, communication, project management"
            disabled={disabled}
            className="rounded-xl border-indigo-100 dark:border-indigo-900/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Education level</Label>
          <Select value={form.education} onValueChange={onEducationChange} disabled={disabled}>
            <SelectTrigger className="w-full rounded-xl border-indigo-100 dark:border-indigo-900/50">
              <SelectValue placeholder="Select education" />
            </SelectTrigger>
            <SelectContent>
              {EDUCATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidance-goals">Career goals (optional)</Label>
          <Textarea
            id="guidance-goals"
            value={form.goals}
            onChange={(e) => onGoalsChange(e.target.value)}
            placeholder="Where do you want to be in 2–5 years?"
            disabled={disabled}
            rows={3}
            className="resize-none rounded-xl border-indigo-100 dark:border-indigo-900/50"
          />
        </div>

        <Button
          type="button"
          className="w-full rounded-xl bg-indigo-600 py-6 text-base font-semibold shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          onClick={onSubmit}
          disabled={disabled}
        >
          {disabled ? "Getting guidance…" : "Get Guidance"}
        </Button>
      </CardContent>
    </Card>
  )
}
