export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: "Email is required",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
    };
  }

  return { isValid: true };
};

export const validateISBN = (isbn: string): ValidationResult => {
  if (!isbn || !isbn.trim()) {
    return {
      isValid: false,
      error: "ISBN is required",
    };
  }

  const cleanedISBN = isbn.replace(/[-\s]/g, "");

  if (cleanedISBN.length !== 10 && cleanedISBN.length !== 13) {
    return {
      isValid: false,
      error: "ISBN must be 10 or 13 digits",
    };
  }

  if (!/^\d+$/.test(cleanedISBN)) {
    return {
      isValid: false,
      error: "ISBN must contain only numbers",
    };
  }

  return { isValid: true };
};

export const validateRequired = (
  value: string | number | null | undefined,
  fieldName: string
): ValidationResult => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim()) ||
    (typeof value === "number" && value === 0)
  ) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: "Phone number is required",
    };
  }

  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return {
      isValid: false,
      error: "Please enter a valid phone number",
    };
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return {
      isValid: false,
      error: "Phone number must have at least 10 digits",
    };
  }

  return { isValid: true };
};

export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult => {
  if (!value || value.trim().length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  return { isValid: true };
};

export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): ValidationResult => {
  if (value && value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return { isValid: true };
};
