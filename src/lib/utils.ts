import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(dateStr: string | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!dateStr) return '-';
  try { return format(parseISO(dateStr), fmt, { locale: ptBR }); } catch { return '-'; }
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try { return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return '-'; }
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function ageBirthDate(birthDate: string | undefined): string {
  if (!birthDate) return '-';
  try {
    const d = parseISO(birthDate);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return `${age} anos`;
  } catch { return '-'; }
}

export const sessionStatusLabel: Record<string, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  faltou: 'Faltou',
};

export const sessionStatusClass: Record<string, string> = {
  agendada: 'badge-info',
  realizada: 'badge-success',
  cancelada: 'badge-muted',
  faltou: 'badge-warning',
};

export const paymentStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
};

export const paymentStatusClass: Record<string, string> = {
  pendente: 'badge-warning',
  pago: 'badge-success',
  cancelado: 'badge-muted',
  vencido: 'badge-danger',
};

export const patientStatusLabel: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  alta: 'Alta',
};

export const patientStatusClass: Record<string, string> = {
  ativo: 'badge-success',
  inativo: 'badge-muted',
  alta: 'badge-primary',
};

export function extractMeetLink(session: any): string | null {
  if (session.meet_link) return session.meet_link;
  if (!session.notes) return null;
  const match = session.notes.match(/(https?:\/\/meet\.google\.com\/[a-z0-9\-]+)/i);
  if (match) return match[1];
  return null;
}

/**
 * Abre o WhatsApp com mensagem pré-formatada contendo os links da sessão.
 */
export function openWhatsApp(params: {
  phone?: string;
  patientName: string;
  analystName: string;
  dateTime: string;
  meetLink?: string | null;
  paymentLink?: string | null;
}) {
  const { phone, patientName, analystName, dateTime, meetLink, paymentLink } = params;

  let dateFmt = '-';
  try {
    const d = parseISO(dateTime);
    dateFmt = format(d, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    dateFmt = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);
  } catch {}

  const lines: string[] = [
    `Olá, ${patientName}! 🌿`,
    ``,
    `Sua consulta foi agendada:`,
    `📅 ${dateFmt}`,
  ];

  if (meetLink) {
    lines.push(``, `📹 *Link para a sessão (Google Meet):*`, meetLink);
  }

  if (paymentLink) {
    lines.push(``, `💳 *Link para pagamento:*`, paymentLink);
  }

  // Assinatura profissional — o site é o último link para gerar a prévia da logo no WhatsApp
  lines.push(
    ``,
    `─────────────────────`,
    `*${analystName}*`,
    `_Psicanalista_`,
    `🌐 www.alineherts.com.br`
  );

  const message = encodeURIComponent(lines.join('\n'));

  // Remove formatação do número (apenas dígitos)
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const url = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=${message}`
    : `https://wa.me/?text=${message}`;

  window.open(url, '_blank');
}

