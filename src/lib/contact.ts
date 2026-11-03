// "Best way to reach them" (Kai, 4 Nov 2026), picked at check-in or on a
// profile. Phone kinds save the number to people.phone, email to
// people.email, Instagram/Facebook to people.contact_handle.

export const BEST_CONTACT: {
  id: string;
  label: string;
  placeholder: string;
  input: "tel" | "email" | "text";
}[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    placeholder: "Mobile number",
    input: "tel",
  },
  {
    id: "text",
    label: "Text message",
    placeholder: "Mobile number",
    input: "tel",
  },
  {
    id: "call",
    label: "Phone call",
    placeholder: "Mobile number",
    input: "tel",
  },
  { id: "email", label: "Email", placeholder: "Email address", input: "email" },
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "@handle",
    input: "text",
  },
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "Name or profile link",
    input: "text",
  },
];

export const bestContactLabel = (id: string | null | undefined) =>
  BEST_CONTACT.find((c) => c.id === id)?.label ?? null;
