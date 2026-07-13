import {
  acquireWebglSlot,
  cancelWebglSlotRequest,
  configureWebglBudget,
  getWebglBudget,
  releaseWebglSlot,
} from '../src/webglBudget';

describe('webglBudget', () => {
  afterEach(() => {
    // Drain any slots left held by a test so state doesn't leak across tests.
    const { active } = getWebglBudget();
    for (let i = 0; i < active; i += 1) releaseWebglSlot();
    configureWebglBudget(4);
  });

  it('grants slots up to the configured max and reports usage', () => {
    configureWebglBudget(2);
    expect(getWebglBudget()).toEqual({ active: 0, max: 2 });

    expect(acquireWebglSlot()).toBe(true);
    expect(acquireWebglSlot()).toBe(true);
    expect(getWebglBudget()).toEqual({ active: 2, max: 2 });

    expect(acquireWebglSlot()).toBe(false);
    expect(getWebglBudget().active).toBe(2);
  });

  it('releasing a slot frees capacity for a new acquisition', () => {
    configureWebglBudget(1);
    expect(acquireWebglSlot()).toBe(true);
    expect(acquireWebglSlot()).toBe(false);

    releaseWebglSlot();
    expect(getWebglBudget().active).toBe(0);
    expect(acquireWebglSlot()).toBe(true);
  });

  it('notifies a waiter once a slot opens up', () => {
    configureWebglBudget(1);
    expect(acquireWebglSlot()).toBe(true);

    const onGrant = jest.fn();
    expect(acquireWebglSlot(onGrant)).toBe(false);
    expect(onGrant).not.toHaveBeenCalled();

    releaseWebglSlot();
    expect(onGrant).toHaveBeenCalledTimes(1);
    expect(getWebglBudget().active).toBe(1);
  });

  it('cancelling a waiter stops it from being notified later', () => {
    configureWebglBudget(1);
    expect(acquireWebglSlot()).toBe(true);

    const onGrant = jest.fn();
    acquireWebglSlot(onGrant);
    cancelWebglSlotRequest(onGrant);

    releaseWebglSlot();
    expect(onGrant).not.toHaveBeenCalled();
  });

  it('raising the max via configureWebglBudget notifies waiters immediately', () => {
    configureWebglBudget(1);
    expect(acquireWebglSlot()).toBe(true);

    const onGrant = jest.fn();
    acquireWebglSlot(onGrant);

    configureWebglBudget(2);
    expect(onGrant).toHaveBeenCalledTimes(1);
  });
});
