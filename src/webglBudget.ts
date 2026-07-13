type Listener = () => void;

let maxConcurrent = 4;
let active = 0;
const waiters = new Set<Listener>();

function notifyWaiters(): void {
  while (active < maxConcurrent && waiters.size > 0) {
    const listener = waiters.values().next().value as Listener;
    waiters.delete(listener);
    // Reserve the slot before calling out — the waiter is being granted
    // exactly the capacity acquireWebglSlot() would have given it
    // synchronously, so it must count against the budget the same way.
    active += 1;
    listener();
  }
}

/**
 * Ajusta o número máximo de contextos WebGL simultâneos que useThreeSketch
 * respeita. Browsers descartam o contexto mais antigo silenciosamente ao
 * estourar o teto do processo (Safari costuma ser bem mais restritivo que
 * Chrome), então o padrão (4) é conservador para caber várias prévias na
 * mesma página sem depender do limite exato de cada navegador.
 */
export function configureWebglBudget(max: number): void {
  maxConcurrent = Math.max(1, max);
  notifyWaiters();
}

export function getWebglBudget(): { active: number; max: number } {
  return { active, max: maxConcurrent };
}

/**
 * Reserva um slot no orçamento global. Retorna true se conseguiu na hora
 * (o chamador deve chamar releaseWebglSlot() quando terminar). Se não
 * houver slot livre, registra `onGrant` para ser chamado assim que um se
 * abrir — o chamador decide o que fazer nesse momento (tipicamente tentar
 * adquirir de novo).
 */
export function acquireWebglSlot(onGrant?: Listener): boolean {
  if (active < maxConcurrent) {
    active += 1;
    return true;
  }
  if (onGrant) waiters.add(onGrant);
  return false;
}

export function cancelWebglSlotRequest(onGrant: Listener): void {
  waiters.delete(onGrant);
}

export function releaseWebglSlot(): void {
  active = Math.max(0, active - 1);
  notifyWaiters();
}
