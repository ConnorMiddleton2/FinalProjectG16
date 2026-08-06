export type TenantLoginValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type TenantSignupValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unit: string;
  invitationCode: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
};

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.trim();
}

export function isValidEmail(email: string) {
  return EMAIL_RE.test(normalizeEmail(email));
}

/** US-friendly phone: 10 digits, or 11 with leading 1. */
export function isValidPhone(phone: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}

export type PasswordStrength = {
  ok: boolean;
  score: number;
  requirements: Array<{ id: string; label: string; met: boolean }>;
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const requirements = [
    {
      id: "length",
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      id: "upper",
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      id: "lower",
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      met: /\d/.test(password),
    },
    {
      id: "special",
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
  const score = requirements.filter((r) => r.met).length;
  return { ok: requirements.every((r) => r.met), score, requirements };
}

export function validateTenantLogin(values: TenantLoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.password) {
    errors.password = "Password is required.";
  }
  return errors;
}

export function validateTenantSignup(values: TenantSignupValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  }
  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }
  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(values.phone)) {
    errors.phone = "Enter a valid phone number (e.g. 555-555-0123).";
  }
  if (!values.unit.trim()) {
    errors.unit = "Property or unit number is required.";
  }
  if (!values.invitationCode.trim()) {
    errors.invitationCode = "Invitation or registration code is required.";
  }

  const strength = evaluatePasswordStrength(values.password);
  if (!values.password) {
    errors.password = "Password is required.";
  } else if (!strength.ok) {
    errors.password =
      "Password must be at least 8 characters and include upper, lower, number, and special character.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.agreeToTerms) {
    errors.agreeToTerms =
      "You must agree to the terms of use and privacy policy.";
  }

  return errors;
}

export function mapAuthErrorMessage(raw: string, context: "login" | "signup" | "reset") {
  const msg = raw.toLowerCase();

  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Email not confirmed. Check your inbox for a verification link, or ask a project admin to disable Confirm email in Supabase for demos.";
  }
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials") ||
    msg.includes("wrong password")
  ) {
    return "Incorrect email or password. Check your credentials and try again.";
  }
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("email address is already")
  ) {
    return "An account with this email already exists. Sign in instead, or use Forgot password if you need access.";
  }
  if (msg.includes("password") && context === "signup") {
    return raw;
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (context === "reset" && (msg.includes("unable") || msg.includes("error"))) {
    return "We could not send a reset email. Check the address and try again.";
  }
  return raw || "Something went wrong. Please try again.";
}
