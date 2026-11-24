import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from './setup';
import { OrderFlowBackdrop } from '@/components/layout/OrderFlowBackdrop';
import { poseAt, stageAt, STAGE_IDS, STAGES } from '@/components/layout/orderFlow';

const wide = () => mockMatchMedia((query) => query === '(min-width: 1280px)');
const figure = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-order-flow]');

describe('order-flow scroll maths', () => {
  // Sections start at 1000, 2500 and 4000; the change runs 200px either side of each start.
  const boundaries = [1000, 2500, 4000];

  it('holds an arrangement while its section is read', () => {
    expect(stageAt(0, boundaries, 200)).toBe(0);
    expect(stageAt(800, boundaries, 200)).toBe(0);
    expect(stageAt(1200, boundaries, 200)).toBe(1);
    expect(stageAt(2000, boundaries, 200)).toBe(1);
    expect(stageAt(9000, boundaries, 200)).toBe(3);
  });

  it('changes in proportion to the scroll across a boundary, both ways', () => {
    expect(stageAt(900, boundaries, 200)).toBeCloseTo(0.25);
    expect(stageAt(1000, boundaries, 200)).toBeCloseTo(0.5);
    expect(stageAt(1100, boundaries, 200)).toBeCloseTo(0.75);
    expect(stageAt(2600, boundaries, 200)).toBeCloseTo(1.75);
  });

  it('poses the drawing exactly on an arrangement, and halfway between two', () => {
    const stages = STAGE_IDS.map((id) => STAGES[id]);
    const about = poseAt(stages, 1);
    expect(about.x).toBe(STAGES.about.x);
    expect(about.hubs).toEqual(STAGES.about.hubs);
    expect(about.routes[1]).toBe(1);

    const between = poseAt(stages, 1.5);
    expect(between.x).toBeCloseTo((STAGES.about.x + STAGES.skills.x) / 2);
    // Mid-change, neither arrangement's routes are drawn: the old ones have gone, the new ones wait.
    expect(between.routes[1]).toBe(0);
    expect(between.routes[2]).toBe(0);
    // The first hub sets off before the last.
    const moved = (i: number) =>
      Math.hypot(
        (between.hubs[i]?.[0] ?? 0) - (STAGES.about.hubs[i]?.[0] ?? 0),
        (between.hubs[i]?.[1] ?? 0) - (STAGES.about.hubs[i]?.[1] ?? 0),
      ) /
      Math.hypot(
        (STAGES.skills.hubs[i]?.[0] ?? 0) - (STAGES.about.hubs[i]?.[0] ?? 0),
        (STAGES.skills.hubs[i]?.[1] ?? 0) - (STAGES.about.hubs[i]?.[1] ?? 0),
      );
    expect(moved(0)).toBeGreaterThan(moved(11));
  });

  it('sways only the arrangements that allow it', () => {
    const stages = STAGE_IDS.map((id) => STAGES[id]);
    expect(poseAt(stages, 1, 10).turn).toBe(STAGES.about.turn + 10);
    expect(poseAt(stages, 3, 10).turn).toBe(STAGES.experience.turn);
  });
});

describe('order-flow backdrop', () => {
  it('is not drawn below 1280px', () => {
    const { container } = render(<OrderFlowBackdrop />);
    expect(figure(container)).toBeNull();
  });

  it('is decorative, invisible over the hero, with twelve hubs and one route group per arrangement', () => {
    wide();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { container } = render(<OrderFlowBackdrop />);
    const node = figure(container);
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node).toHaveClass('print:hidden', 'forced-colors:hidden');
    expect(node?.style.getPropertyValue('--stage-alpha')).toBe('0');
    expect(container.querySelectorAll('[data-hub]')).toHaveLength(12);
    expect(container.querySelectorAll('[data-routes]')).toHaveLength(STAGE_IDS.length);
  });
});
