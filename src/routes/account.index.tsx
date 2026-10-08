import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/auth-context";
import { updateProfile } from "@/features/auth/django-client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import type { Role } from "@/features/auth/types";

function roleLabel(role: Role | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (role === "buyer") return t("account.role.buyer");
  if (role === "seller") return t("account.role.seller");
  if (role === "admin") return t("account.role.admin");
  return "—";
}

export const Route = createFileRoute("/account/")({
  component: ProfileForm,
});

function ProfileForm() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setRole(user.role ?? "buyer");
    }
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { first_name: firstName, last_name: lastName, role });
      await refresh();
      toast.success(t("account.saved"));
    } catch {
      toast.error(t("auth.error.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-semibold">{t("account.profile.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("account.profile.subtitle")}</p>
      </header>

      <Card className="border-border/60">
        <CardContent className="p-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("auth.firstName")}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">{t("auth.lastName")}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("account.field.email")}</Label>
            <Input id="email" type="email" value={user?.user?.email ?? ""} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t("account.field.role")}</Label>
            {user?.role === "admin" ? (
              <Input id="role" value={roleLabel(user?.role, t)} disabled readOnly />
            ) : (
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">{t("account.role.buyer")}</SelectItem>
                  <SelectItem value="seller">{t("account.role.seller")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" className="gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("account.save")}
        </Button>
      </div>
    </form>
  );
}
