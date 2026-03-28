/**
 * Mercado Pago Integration
 * Uses the Mercado Pago API to create payment preferences and generate payment links.
 * Configure your Access Token in the Settings page.
 */

interface MPPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface MPPayer {
  name?: string;
  email?: string;
}

interface MPPreferenceResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createMPPaymentLink(
  accessToken: string,
  items: MPPreferenceItem[],
  payer?: MPPayer,
  description?: string
): Promise<MPPreferenceResult> {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      payer,
      statement_descriptor: description || 'Clínica de Psicanálise',
      payment_methods: {
        excluded_payment_types: [],
        installments: 1,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Erro ao criar link de pagamento');
  }

  return response.json();
}

export async function getMPPaymentStatus(
  accessToken: string,
  paymentId: string
): Promise<{ status: string; status_detail: string }> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Erro ao consultar pagamento');
  return response.json();
}

export async function checkMPPaymentByPreferenceId(
  accessToken: string,
  preferenceId: string
): Promise<boolean> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("MP Search API Error:", errorText);
    throw new Error(`Erro ao buscar pagamentos: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const results = data.results || [];
  // Se houver algum pagamento aprovado para essa preferência
  return results.some((payment: any) => payment.status === 'approved');
}
