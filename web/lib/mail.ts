import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import type { Draft } from "./store";

const e = (k: string, d = "") => process.env[k] ?? d;
const from = () => `${e("FROM_NAME", "Zeta Labs")} <${e("EMAIL_ADDRESS")}>`;

export function mailOptions(d: Draft) {
  const footer = `\n\n--\n${e("FROM_NAME", "Zeta Labs")}\nZeta Labs | https://www.thezetalabs.xyz\nNot relevant? Reply "unsubscribe" and I won't email again.`;
  return {
    from: from(), to: d.email, subject: d.subject, text: d.body + footer,
    headers: { "List-Unsubscribe": `<mailto:${e("EMAIL_ADDRESS")}?subject=unsubscribe>` },
  };
}

export const transport = () =>
  nodemailer.createTransport({
    host: e("SMTP_HOST"), port: Number(e("SMTP_PORT", "465")), secure: Number(e("SMTP_PORT", "465")) === 465,
    auth: { user: e("EMAIL_ADDRESS"), pass: e("EMAIL_PASSWORD") },
  });

export async function saveToImapDrafts(drafts: Draft[]) {
  const raw = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const client = new ImapFlow({
    host: e("IMAP_HOST"), port: Number(e("IMAP_PORT", "993")), secure: true,
    auth: { user: e("EMAIL_ADDRESS"), pass: e("EMAIL_PASSWORD") }, logger: false,
  });
  await client.connect();
  try {
    for (const d of drafts) {
      const info = await raw.sendMail(mailOptions(d));
      await client.append(e("IMAP_DRAFTS_FOLDER", "Drafts"), info.message as Buffer, ["\\Draft"]);
    }
  } finally { await client.logout(); }
}
