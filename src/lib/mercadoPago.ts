/**
 * Mercado Pago Integration
 * Uses the Mercado Pago API to create payment preferences and generate payment links.
 * Credentials are loaded from environment variables automatically.
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
  description?: string,
  externalReference?: string,
): Promise<MPPreferenceResult> {
  const WEBHOOK_URL = 'https://llrrnxalrolkmzcxihud.supabase.co/functions/v1/mp-webhook';

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
      external_reference: externalReference,
      notification_url: WEBHOOK_URL,
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

/**
 * Verifica o status de um pagamento consultando a preferência de pagamento.
 * Esta função usa o endpoint de preferências (CORS aberto) e verifica os merchant_orders.
 * O status é determinado pelo campo status da preferência.
 */
export async function checkMPPaymentByPreferenceId(
  accessToken: string,
  preferenceId: string
): Promise<boolean> {
  // Consulta os merchant orders vinculados a essa preferência
  // Este endpoint tem CORS aberto pelo Mercado Pago
  const response = await fetch(
    `https://api.mercadopago.com/merchant_orders/search?preference_id=${preferenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MP Merchant Orders API Error:', response.status, errorText);
    throw new Error(`Erro ao verificar pagamento: ${response.status}`);
  }

  const data = await response.json();
  const orders = data.elements || [];

  // Um pedido é considerado pago quando o valor pago >= valor total
  return orders.some(
    (order: any) => order.status === 'closed' || Number(order.paid_amount) >= Number(order.total_amount)
  );
}
